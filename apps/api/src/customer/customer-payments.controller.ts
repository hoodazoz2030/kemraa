import { Controller, Get, Post, Body, UseGuards, Req, Param, Query, SetMetadata } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { randomUUID } from "node:crypto";

/**
 * §12 + §15-16 — Customer-facing Payments.
 * Creates payment intents in CREATED state; admin/gateway transitions through state machine.
 */
@ApiTags("customer-payments")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("customer-payments")
export class CustomerPaymentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @SetMetadata("roles", ["CUSTOMER"])
  async list(@Req() req: any) {
    // Payments by traveler (travelerId field) or by user's bookings
    const userBookings = await this.prisma.booking.findMany({
      where: { travelerId: req.user.sub },
      select: { id: true },
    });
    const bookingIds = userBookings.map((b) => b.id);

    const items = await this.prisma.payment.findMany({
      where: {
        OR: [
          { travelerId: req.user.sub },
          { bookingId: { in: bookingIds } },
        ],
      },
      include: { booking: { select: { id: true, status: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { items };
  }

  @Get(":id")
  @SetMetadata("roles", ["CUSTOMER"])
  async get(@Req() req: any, @Param("id") id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id },
      include: { booking: true, ledger: true, stateHistory: { orderBy: { createdAt: "desc" } } },
    });
    if (!payment) return { error: { code: "NOT_FOUND" } };

    // Verify ownership
    const isOwner = payment.travelerId === req.user.sub ||
      (payment.booking && payment.booking.travelerId === req.user.sub);
    if (!isOwner) return { error: { code: "FORBIDDEN" } };

    return payment;
  }

  @Post("intents")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("payment.create_intent", "payment")
  async createIntent(@Req() req: any, @Body() body: { bookingId?: string; amountMinor: number; currency?: string; methodType?: string; provider?: string }) {
    // Verify booking ownership if provided
    if (body.bookingId) {
      const booking = await this.prisma.booking.findFirst({ where: { id: body.bookingId, travelerId: req.user.sub } });
      if (!booking) return { error: { code: "BOOKING_NOT_FOUND" } };
    }

    const payment = await this.prisma.payment.create({
      data: {
        travelerId: req.user.sub,
        bookingId: body.bookingId ?? null,
        amountMinor: body.amountMinor,
        currency: body.currency || "EGP",
        methodType: body.methodType || "CARD",
        provider: body.provider || "MOCK",
        status: "CREATED" as any,
        idempotencyKey: `cust_${randomUUID()}`,
      },
    });

    return {
      paymentId: payment.id,
      status: payment.status,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      message: "Payment intent created. Use state machine to transition.",
    };
  }
}
