import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";
import Stripe from "stripe";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_placeholder";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe | null = null;

  constructor(private readonly prisma: PrismaService) {
    if (STRIPE_SECRET && !STRIPE_SECRET.includes("placeholder")) {
      this.stripe = new Stripe(STRIPE_SECRET);
      this.logger.log("Stripe initialized");
    } else {
      this.logger.warn("Stripe not configured — payments will fail with PAYMENTS_DISABLED");
    }
  }

  async createPaymentIntent(userId: string, dto: any) {
    if (!this.stripe) {
      throw new BadRequestException({ code: "PAYMENTS_DISABLED", message: "Stripe not configured" });
    }
    const booking = await this.prisma.booking.findUnique({ where: { id: dto.bookingId } });
    if (!booking) throw new NotFoundException({ code: "BOOKING_NOT_FOUND" });
    if (booking.travelerId !== userId) throw new BadRequestException({ code: "BOOKING_NOT_OWNED" });

    const intent = await this.stripe.paymentIntents.create({
      amount: dto.amountMinor,
      currency: dto.currency.toLowerCase(),
      metadata: { bookingId: dto.bookingId, userId },
      description: dto.description ?? `Booking ${dto.bookingId.slice(0, 8)}`,
    });

    const payment = await this.prisma.payment.create({
      data: {
        bookingId: dto.bookingId,
        tripId: booking.tripId,
        provider: "STRIPE",
        providerPaymentId: intent.id,
        amountMinor: dto.amountMinor,
        currency: dto.currency.toUpperCase(),
        methodType: "CARD",
        status: "CREATED",
        idempotencyKey: randomUUID(),
      },
    });

    return {
      paymentId: payment.id,
      clientSecret: intent.client_secret,
      amountMinor: dto.amountMinor,
      currency: dto.currency,
    };
  }

  async handleWebhook(payload: Buffer, sig: string) {
    if (!this.stripe) throw new BadRequestException("Stripe not configured");

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      this.logger.warn("Webhook signature verification failed: " + err.message);
      throw new BadRequestException("Invalid signature");
    }

    this.logger.log(`Stripe webhook: ${event.type}`);

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const bookingId = intent.metadata.bookingId;
      await this.prisma.payment.updateMany({
        where: { providerPaymentId: intent.id },
        data: { status: "CAPTURED" },
      });
      if (bookingId) {
        await this.prisma.booking.update({
          where: { id: bookingId },
          data: { status: "CONFIRMED" as any },
        }).catch(() => {});
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.prisma.payment.updateMany({
        where: { providerPaymentId: intent.id },
        data: { status: "FAILED" },
      });
    }

    return { received: true };
  }

  async listPayments(userId: string, limit = 20) {
    return this.prisma.payment.findMany({
      where: { booking: { travelerId: userId } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { booking: true },
    });
  }

  // ============ Fawry (Egyptian sandbox-style mock) ============
  async createFawryPayment(userId: string, dto: any) {
    const booking = await this.prisma.booking.findUnique({ where: { id: dto.bookingId } });
    if (!booking) throw new NotFoundException({ code: "BOOKING_NOT_FOUND" });
    if (booking.travelerId !== userId) throw new BadRequestException({ code: "BOOKING_NOT_OWNED" });

    const reference = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const payment = await this.prisma.payment.create({
      data: {
        bookingId: dto.bookingId,
        tripId: booking.tripId,
        provider: "FAWRY",
        providerPaymentId: reference,
        amountMinor: dto.amountMinor,
        currency: dto.currency.toUpperCase(),
        methodType: "CASH",
        status: "CREATED",
        idempotencyKey: randomUUID(),
      },
    });

    this.logger.log(`Fawry payment created: ${reference} for booking ${dto.bookingId}`);
    return {
      paymentId: payment.id,
      reference,
      amountMinor: dto.amountMinor,
      currency: dto.currency,
      instructions: "Pay at any Fawry outlet using this reference code",
    };
  }

  async confirmFawryPayment(reference: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { provider: "FAWRY", providerPaymentId: reference },
      include: { booking: true },
    });
    if (!payment) throw new NotFoundException({ code: "PAYMENT_NOT_FOUND" });
    if (payment.status !== "CREATED") {
      throw new BadRequestException({ code: "PAYMENT_ALREADY_PROCESSED", status: payment.status });
    }

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: "CAPTURED" },
    });

    if (payment.bookingId) {
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: "CONFIRMED" as any },
      }).catch(() => {});
    }

    this.logger.log(`Fawry payment confirmed: ${reference}`);
    return {
      paymentId: updated.id,
      reference,
      status: updated.status,
      bookingId: payment.bookingId,
    };
  }

  // ============ Admin endpoints ============
  async adminListAll(limit = 50) {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { booking: { include: { traveler: true, service: true } } },
    });
  }

  async adminSummary(from?: string, to?: string) {
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const payments = await this.prisma.payment.findMany({ where });
    const byStatus: Record<string, { count: number; total: number }> = {};
    const byProvider: Record<string, { count: number; total: number }> = {};
    let gross = 0, captured = 0, refunded = 0;

    for (const p of payments) {
      byStatus[p.status] = byStatus[p.status] ?? { count: 0, total: 0 };
      byStatus[p.status].count++;
      byStatus[p.status].total += p.amountMinor;
      byProvider[p.provider] = byProvider[p.provider] ?? { count: 0, total: 0 };
      byProvider[p.provider].count++;
      byProvider[p.provider].total += p.amountMinor;
      gross += p.amountMinor;
      if (["CAPTURED", "SETTLED", "PARTIALLY_REFUNDED"].includes(p.status)) captured += p.amountMinor;
    }

    const refunds = await this.prisma.refund.aggregate({ _sum: { amountMinor: true } });
    refunded = refunds._sum.amountMinor ?? 0;
    const taxBps = 1400; // 14%
    const tax = Math.round((captured * taxBps) / 10000);
    const net = captured - tax - refunded;

    return {
      total: payments.length,
      gross,
      captured,
      refunded,
      tax,
      net,
      byStatus,
      byProvider,
    };
  }

  // ============ Finance extended ============
  async commissionPayout(from?: string, to?: string) {
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const entries = await this.prisma.commissionEntry.findMany({
      where,
      include: {
        rule: { select: { rateBps: true, basis: true } },
        booking: { select: { id: true, totalMinor: true, traveler: { select: { email: true } }, service: { select: { title: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const byBeneficiary: Record<string, { count: number; total: number; beneficiaryType: string; beneficiaryId: string }> = {};
    let grandTotal = 0;
    const paid = 0;
    const pending = 0;
    for (const e of entries) {
      const key = `${e.beneficiaryType}:${e.beneficiaryId}`;
      byBeneficiary[key] = byBeneficiary[key] ?? { count: 0, total: 0, beneficiaryType: e.beneficiaryType, beneficiaryId: e.beneficiaryId };
      byBeneficiary[key].count++;
      byBeneficiary[key].total += e.amountMinor;
      grandTotal += e.amountMinor;
    }
    return { totalEntries: entries.length, grandTotal, byBeneficiary, entries };
  }

  async taxFiling(month: string) {
    // month = "2026-08"
    const from = new Date(`${month}-01T00:00:00Z`);
    const to = new Date(from);
    to.setMonth(to.getMonth() + 1);
    to.setDate(0); // last day

    const where = { createdAt: { gte: from, lte: to } };
    const captured = await this.prisma.payment.findMany({ where: { ...where, status: "CAPTURED" } });
    const refunds = await this.prisma.refund.findMany({ where });
    const gross = captured.reduce((s, p) => s + p.amountMinor, 0);
    const refunded = refunds.reduce((s, r) => s + r.amountMinor, 0);
    const taxable = gross - refunded;
    const taxBps = 1400;
    const tax = Math.max(0, Math.round((taxable * taxBps) / 10000));
    return {
      month,
      from: from.toISOString(),
      to: to.toISOString(),
      gross, refunded, taxable, tax,
      transactions: captured.length,
      refunds: refunds.length,
    };
  }

  async exportFinanceCSV(from?: string, to?: string) {
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const payments = await this.prisma.payment.findMany({
      where,
      include: { booking: { include: { service: true, traveler: true } } },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    const headers = ["date","provider","method","status","amount_minor","currency","booking_id","service","customer_email"];
    const rows = payments.map((p) => [
      p.createdAt.toISOString(),
      p.provider,
      p.methodType,
      p.status,
      p.amountMinor,
      p.currency,
      p.bookingId ?? "",
      p.booking?.service?.title ?? "",
      p.booking?.traveler?.email ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    return [headers.join(","), ...rows].join("\n");
  }
}