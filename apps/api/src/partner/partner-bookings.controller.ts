import { Controller, Get, Post, Body, UseGuards, Req, Param, Query, SetMetadata, Logger } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §19 — Partner booking inbox + state machine actions.
 * Provider filter: Booking.providerId = Organization.id (via partner membership).
 */
@ApiTags("partner-bookings")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("partner-bookings")
export class PartnerBookingsController {
  private readonly logger = new Logger(PartnerBookingsController.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getProviderId(userId: string): Promise<string | null> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, role: "PARTNER_ADMIN" as any, status: "ACTIVE" as any },
    });
    return membership?.organizationId ?? null;
  }

  /**
   * List bookings for partner's services.
   */
  @Get()
  @SetMetadata("roles", ["CUSTOMER"])
  async list(@Req() req: any, @Query() q: any) {
    const providerId = await this.getProviderId(req.user.sub);
    if (!providerId) return { items: [], total: 0 };

    const where: any = { providerId };
    if (q.status) where.status = q.status;

    const items = await this.prisma.booking.findMany({
      where,
      include: {
        service: { select: { id: true, title: true, type: true } },
        traveler: { select: { id: true, email: true } },
        payments: { take: 1, orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Number(q.limit) || 50, 100),
    });

    return { items, total: await this.prisma.booking.count({ where }) };
  }

  @Get(":id")
  @SetMetadata("roles", ["CUSTOMER"])
  async get(@Req() req: any, @Param("id") id: string) {
    const providerId = await this.getProviderId(req.user.sub);
    const booking = await this.prisma.booking.findFirst({
      where: { id, providerId: providerId ?? "__none__" },
      include: {
        service: true,
        traveler: { select: { id: true, email: true, phone: true } },
        items: true,
        payments: { orderBy: { createdAt: "desc" } },
        commissions: { orderBy: { createdAt: "desc" } },
        stateHistory: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!booking) return { error: { code: "NOT_FOUND" } };
    return booking;
  }

  /**
   * Partner approves booking: PENDING_APPROVAL → PAYMENT_PENDING.
   */
  @Post(":id/approve")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("partner.booking.approve", "booking")
  async approve(@Req() req: any, @Param("id") id: string, @Body() body: { reason?: string } = {}) {
    const providerId = await this.getProviderId(req.user.sub);
    const booking = await this.prisma.booking.findFirst({ where: { id, providerId: providerId ?? "__none__" } });
    if (!booking) return { error: { code: "NOT_FOUND" } };
    if (booking.status !== "PENDING_APPROVAL") {
      return { error: { code: "INVALID_STATE", message: `Expected PENDING_APPROVAL, got ${booking.status}` } };
    }

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: { status: "PAYMENT_PENDING" as any },
      });
      await tx.bookingStateHistory.create({
        data: {
          bookingId: id,
          fromStatus: "PENDING_APPROVAL",
          toStatus: "PAYMENT_PENDING",
          actorId: req.user.sub,
          actorType: "PARTNER",
          reason: body.reason ?? null,
        },
      });
      this.logger.log(`Booking ${id} approved by partner ${providerId}`);
      return updated;
    });
  }

  /**
   * Partner rejects booking: PENDING_APPROVAL → REJECTED.
   */
  @Post(":id/reject")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("partner.booking.reject", "booking")
  async reject(@Req() req: any, @Param("id") id: string, @Body() body: { reason?: string }) {
    const providerId = await this.getProviderId(req.user.sub);
    const booking = await this.prisma.booking.findFirst({ where: { id, providerId: providerId ?? "__none__" } });
    if (!booking) return { error: { code: "NOT_FOUND" } };
    if (booking.status !== "PENDING_APPROVAL") {
      return { error: { code: "INVALID_STATE", message: `Expected PENDING_APPROVAL, got ${booking.status}` } };
    }

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: { status: "REJECTED" as any },
      });
      await tx.bookingStateHistory.create({
        data: {
          bookingId: id,
          fromStatus: "PENDING_APPROVAL",
          toStatus: "REJECTED",
          actorId: req.user.sub,
          actorType: "PARTNER",
          reason: body.reason ?? "Partner rejection",
        },
      });
      this.logger.log(`Booking ${id} rejected by partner ${providerId}`);
      return updated;
    });
  }

  /**
   * Partner confirms booking after payment: CONFIRMING → CONFIRMED.
   */
  @Post(":id/confirm")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("partner.booking.confirm", "booking")
  async confirm(@Req() req: any, @Param("id") id: string, @Body() body: { externalRef?: string; reason?: string } = {}) {
    const providerId = await this.getProviderId(req.user.sub);
    const booking = await this.prisma.booking.findFirst({ where: { id, providerId: providerId ?? "__none__" } });
    if (!booking) return { error: { code: "NOT_FOUND" } };
    if (booking.status !== "CONFIRMING") {
      return { error: { code: "INVALID_STATE", message: `Expected CONFIRMING, got ${booking.status}` } };
    }

    return await this.prisma.$transaction(async (tx) => {
      const data: any = { status: "CONFIRMED" as any };
      if (body.externalRef) data.externalRef = body.externalRef;
      const updated = await tx.booking.update({ where: { id }, data });
      await tx.bookingStateHistory.create({
        data: {
          bookingId: id,
          fromStatus: "CONFIRMING",
          toStatus: "CONFIRMED",
          actorId: req.user.sub,
          actorType: "PARTNER",
          reason: body.reason ?? null,
          metadata: body.externalRef ? { externalRef: body.externalRef } : {},
        } as any,
      });
      this.logger.log(`Booking ${id} confirmed by partner ${providerId}`);
      return updated;
    });
  }

  /**
   * Mark booking as COMPLETED after service delivery.
   */
  @Post(":id/complete")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("partner.booking.complete", "booking")
  async complete(@Req() req: any, @Param("id") id: string, @Body() body: { reason?: string } = {}) {
    const providerId = await this.getProviderId(req.user.sub);
    const booking = await this.prisma.booking.findFirst({ where: { id, providerId: providerId ?? "__none__" } });
    if (!booking) return { error: { code: "NOT_FOUND" } };
    if (booking.status !== "CONFIRMED") {
      return { error: { code: "INVALID_STATE", message: `Expected CONFIRMED, got ${booking.status}` } };
    }

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: { status: "COMPLETED" as any },
      });
      await tx.bookingStateHistory.create({
        data: {
          bookingId: id,
          fromStatus: "CONFIRMED",
          toStatus: "COMPLETED",
          actorId: req.user.sub,
          actorType: "PARTNER",
          reason: body.reason ?? "Service delivered",
        },
      });
      return updated;
    });
  }
}
