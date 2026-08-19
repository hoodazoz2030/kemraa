import { Controller, Get, Post, Body, UseGuards, Req, Param, Query, SetMetadata } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §12 + §14 — Customer-facing Bookings.
 * Creates bookings in DRAFT state; customer then transitions to PENDING_APPROVAL.
 */
@ApiTags("customer-bookings")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("customer-bookings")
export class CustomerBookingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @SetMetadata("roles", ["CUSTOMER"])
  async list(@Req() req: any, @Query() q: any) {
    const where: any = { travelerId: req.user.sub };
    if (q.status) where.status = q.status;

    const items = await this.prisma.booking.findMany({
      where,
      include: {
        service: { select: { id: true, title: true, type: true } },
        trip: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { items, total: await this.prisma.booking.count({ where }) };
  }

  @Get(":id")
  @SetMetadata("roles", ["CUSTOMER"])
  async get(@Req() req: any, @Param("id") id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, travelerId: req.user.sub },
      include: {
        service: true,
        trip: true,
        payments: { orderBy: { createdAt: "desc" } },
        stateHistory: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!booking) return { error: { code: "NOT_FOUND", message: "Booking not found" } };
    return booking;
  }

  @Post()
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("booking.create", "booking")
  async create(@Req() req: any, @Body() body: { serviceId: string; tripId?: string; items?: any[]; totalMinor: number; currency?: string }) {
    // Verify service exists
    const service = await this.prisma.service.findUnique({ where: { id: body.serviceId } });
    if (!service) return { error: { code: "SERVICE_NOT_FOUND" } };

    // Verify trip belongs to user if provided
    if (body.tripId) {
      const trip = await this.prisma.trip.findFirst({ where: { id: body.tripId, travelerId: req.user.sub } });
      if (!trip) return { error: { code: "TRIP_NOT_FOUND" } };
    }

    const booking = await this.prisma.booking.create({
      data: {
        travelerId: req.user.sub,
        serviceId: body.serviceId,
        providerId: service.providerId,
        tripId: body.tripId ?? null,
        status: "DRAFT" as any,
        totalMinor: body.totalMinor,
        currency: body.currency || "EGP",
        items: (body.items ?? []) as any,
        idempotencyKey: `cust_booking_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      },
    });
    return booking;
  }

  /**
   * Customer submits booking for approval (DRAFT -> PENDING_APPROVAL).
   */
  @Post(":id/submit")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("booking.submit", "booking")
  async submit(@Req() req: any, @Param("id") id: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id, travelerId: req.user.sub } });
    if (!booking) return { error: { code: "NOT_FOUND" } };
    if (booking.status !== "DRAFT") return { error: { code: "INVALID_STATE", message: "Booking must be DRAFT" } };

    return await this.prisma.booking.update({
      where: { id },
      data: { status: "PENDING_APPROVAL" as any },
    });
  }

  /**
   * Customer cancels own booking (only DRAFT or PENDING_APPROVAL).
   */
  @Post(":id/cancel")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("booking.cancel", "booking")
  async cancel(@Req() req: any, @Param("id") id: string, @Body() body: { reason?: string }) {
    const booking = await this.prisma.booking.findFirst({ where: { id, travelerId: req.user.sub } });
    if (!booking) return { error: { code: "NOT_FOUND" } };
    if (!["DRAFT", "PENDING_APPROVAL"].includes(booking.status)) {
      return { error: { code: "INVALID_STATE", message: "Only DRAFT or PENDING_APPROVAL can be cancelled" } };
    }

    return await this.prisma.booking.update({
      where: { id },
      data: {
        status: "CANCELLED" as any,
      },
    });
  }
}
