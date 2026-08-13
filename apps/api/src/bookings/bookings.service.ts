import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { Prisma } from "@prisma/client";
import { CreateBookingDto, SubmitPaymentDto, ConfirmBookingDto, CreateReviewDto, ListBookingsQueryDto } from "./dto/bookings.dto.js";

const BOOKING_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PENDING_APPROVAL", "CANCELLED"],
  PENDING_APPROVAL: ["PAYMENT_PENDING", "REJECTED", "CANCELLED"],
  PAYMENT_PENDING: ["CONFIRMING", "FAILED", "CANCELLED"],
  CONFIRMING: ["CONFIRMED", "FAILED"],
  CONFIRMED: ["COMPLETED", "CANCEL_REQUESTED"],
  COMPLETED: [],
  REJECTED: [],
  FAILED: [],
  CANCEL_REQUESTED: ["CANCELLED"],
  CANCELLED: [],
  DISPUTED: ["CANCELLED", "COMPLETED"],
};

const PLATFORM_ORG_ID = "00000000-0000-0000-0000-000000000001";

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBookingDto) {
    const existing = await this.prisma.booking.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
    if (existing) throw new ConflictException({ code: "IDEMPOTENCY_CONFLICT" });

    const service = await this.prisma.service.findUnique({ where: { id: dto.serviceId } });
    if (!service) throw new NotFoundException({ code: "SERVICE_NOT_FOUND" });
    if (service.status !== "ACTIVE") throw new BadRequestException({ code: "SERVICE_NOT_ACTIVE" });

    let totalMinor = 0;
    const items = dto.items.map((it) => {
      const q = it.quantity ?? 1;
      const itemTotal = (it.unitMinor * q) + (it.taxMinor ?? 0) + (it.feeMinor ?? 0);
      totalMinor += itemTotal;
      return {
        description: it.description, quantity: q, unitMinor: it.unitMinor,
        taxMinor: it.taxMinor ?? 0, feeMinor: it.feeMinor ?? 0, totalMinor: itemTotal,
      };
    });

    const bookingData: any = {
      idempotencyKey: dto.idempotencyKey,
      externalRef: dto.externalRef ?? null,
      status: "DRAFT",
      totalMinor,
      currency: service.currency,
      travelerId: userId,
      serviceId: dto.serviceId,
      providerId: service.providerId,
    };
    if (dto.tripId) bookingData.tripId = dto.tripId;
    
    return this.prisma.booking.create({
      data: bookingData,
      include: { items: true, service: { select: { title: true, type: true } } },
    });
  }

  async list(userId: string, isAdmin: boolean, query: ListBookingsQueryDto) {
    const where: any = {};
    if (!isAdmin) where.travelerId = userId;
    if (query.status) where.status = query.status;
    if (query.tripId) where.tripId = query.tripId;
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where, orderBy: { createdAt: "desc" },
        take: Math.min(query.limit ?? 50, 200), skip: query.offset ?? 0,
        include: {
          items: true,
          service: { select: { title: true, type: true } },
          trip: { select: { title: true, status: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { items, total, limit: query.limit ?? 50, offset: query.offset ?? 0 };
  }

  async getOne(userId: string, isAdmin: boolean, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        items: true,
        service: { select: { title: true, type: true } },
        trip: { select: { title: true, status: true } },
        payments: { orderBy: { createdAt: "desc" } },
        commissions: true,
        review: true,
      },
    });
    if (!booking) throw new NotFoundException({ code: "BOOKING_NOT_FOUND" });
    if (!isAdmin && booking.travelerId !== userId) throw new ForbiddenException({ code: "FORBIDDEN" });
    return booking;
  }

  async submitForApproval(userId: string, bookingId: string) {
    const booking = await this.mustOwn(userId, bookingId);
    this.assertTransition(booking.status, "PENDING_APPROVAL");
    if (booking.items.length === 0) throw new BadRequestException({ code: "NO_ITEMS" });
    return this.prisma.booking.update({ where: { id: bookingId }, data: { status: "PENDING_APPROVAL" } });
  }

  async approve(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException({ code: "BOOKING_NOT_FOUND" });
    this.assertTransition(booking.status, "PAYMENT_PENDING");
    return this.prisma.booking.update({ where: { id: bookingId }, data: { status: "PAYMENT_PENDING" } });
  }

  async reject(userId: string, bookingId: string, reason: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException({ code: "BOOKING_NOT_FOUND" });
    this.assertTransition(booking.status, "REJECTED");
    return this.prisma.booking.update({ where: { id: bookingId }, data: { status: "REJECTED" } });
  }

  async submitPayment(userId: string, bookingId: string, dto: SubmitPaymentDto) {
    const booking = await this.mustOwn(userId, bookingId);
    this.assertTransition(booking.status, "CONFIRMING");

    const existingPayment = await this.prisma.payment.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
    if (existingPayment) throw new ConflictException({ code: "PAYMENT_IDEMPOTENCY_CONFLICT" });

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          bookingId, provider: dto.provider, providerPaymentId: dto.providerPaymentId,
          status: "CAPTURED", amountMinor: booking.totalMinor,
          currency: booking.currency, methodType: dto.methodType,
          idempotencyKey: dto.idempotencyKey,
        },
      });
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMING" },
      });
      // Try to compute commission (graceful fallback)
      await this.computeCommission(tx, booking, bookingId);
      return { payment, booking: updatedBooking };
    });
  }

  async confirm(userId: string, bookingId: string, dto: ConfirmBookingDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException({ code: "BOOKING_NOT_FOUND" });
    this.assertTransition(booking.status, "CONFIRMED");
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED", externalRef: dto.externalRef ?? booking.externalRef },
    });
  }

  async complete(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException({ code: "BOOKING_NOT_FOUND" });
    this.assertTransition(booking.status, "COMPLETED");
    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({ where: { id: bookingId }, data: { status: "COMPLETED" } });
      await tx.commissionEntry.updateMany({
        where: { bookingId, status: "PENDING" },
        data: { status: "ELIGIBLE" },
      });
    });
    return this.getOne(userId, false, bookingId);
  }

  async cancel(userId: string, bookingId: string) {
    const booking = await this.mustOwn(userId, bookingId);
    const target = booking.status === "CONFIRMED" ? "CANCEL_REQUESTED" : "CANCELLED";
    this.assertTransition(booking.status, target);
    return this.prisma.booking.update({ where: { id: bookingId }, data: { status: target } });
  }

  async addReview(userId: string, bookingId: string, dto: CreateReviewDto) {
    const booking = await this.mustOwn(userId, bookingId);
    if (booking.status !== "COMPLETED") {
      throw new BadRequestException({ code: "REVIEW_ONLY_AFTER_COMPLETION" });
    }
    if (booking.review) throw new ConflictException({ code: "REVIEW_ALREADY_EXISTS" });
    return this.prisma.review.create({
      data: {
        bookingId, reviewerId: userId,
        targetType: dto.targetType, targetId: dto.targetId,
        rating: dto.rating, comment: dto.comment,
      },
    });
  }

  private async computeCommission(tx: any, booking: any, bookingId: string) {
    try {
      const amountMinor = Math.round(booking.totalMinor * 0.1);
      // Try to find a global/platform rule using scopeType (actual field in schema)
      let rule = await tx.commissionRule.findFirst({
        where: { scopeType: "PLATFORM" },
      }).catch(() => null);
      
      // If no rule, try to create one using actual schema fields
      if (!rule) {
        rule = await tx.commissionRule.create({
          data: {
            scopeType: "PLATFORM",
            basis: "PERCENTAGE",
            rateBps: 1000, // 10% = 1000 basis points
            fixedMinor: 0,
            currency: booking.currency,
            activeFrom: new Date(),
          },
        }).catch(() => null);
      }
      
      if (rule) {
        await tx.commissionEntry.create({
          data: {
            ruleId: rule.id,
            bookingId,
            beneficiaryType: "PLATFORM",
            beneficiaryId: PLATFORM_ORG_ID,
            amountMinor,
            currency: booking.currency,
            status: "PENDING",
            ruleSnapshot: { rate: 0.1, type: "PERCENTAGE", basis: "PERCENTAGE", rateBps: 1000 } as Prisma.InputJsonValue,
          },
        });
      } else {
        // Last resort: create entry with a placeholder ruleId (sandbox mode)
        console.warn("[COMMISSION] No rule found/created, skipping commission entry");
      }
    } catch (e: any) {
      console.warn("[COMMISSION] Failed to compute:", e.message);
      // Don't fail the payment flow if commission fails
    }
  }

  private async mustOwn(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: { items: true, review: true } });
    if (!booking) throw new NotFoundException({ code: "BOOKING_NOT_FOUND" });
    if (booking.travelerId !== userId) throw new ForbiddenException({ code: "FORBIDDEN" });
    return booking;
  }

  private assertTransition(from: string, to: string) {
    if (!BOOKING_TRANSITIONS[from]?.includes(to)) {
      throw new BadRequestException({ code: "INVALID_TRANSITION", message: `Cannot go ${from} -> ${to}` });
    }
  }
}