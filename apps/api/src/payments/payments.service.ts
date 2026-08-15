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

    // Verify booking belongs to user
    const booking = await this.prisma.booking.findUnique({ where: { id: dto.bookingId } });
    if (!booking) throw new NotFoundException({ code: "BOOKING_NOT_FOUND" });
    if (booking.travelerId !== userId) throw new BadRequestException({ code: "BOOKING_NOT_OWNED" });

    // Create Stripe PaymentIntent
    const intent = await this.stripe.paymentIntents.create({
      amount: dto.amountMinor,
      currency: dto.currency.toLowerCase(),
      metadata: { bookingId: dto.bookingId, userId },
      description: dto.description ?? `Booking ${dto.bookingId.slice(0, 8)}`,
    });

    // Save to DB — matches actual Payment schema
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

      // Update booking status
      if (bookingId) {
        await this.prisma.booking.update({
          where: { id: bookingId },
          data: { status: "CONFIRMED" },
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
      where: {
        booking: { travelerId: userId },
      },
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

    // Generate a Fawry-like reference code (10 digits)
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

    // Simulate successful Fawry payment
    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: "CAPTURED" },
    });

    // Update booking to CONFIRMED
    if (payment.bookingId) {
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: "CONFIRMED" },
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

  async adminListAll(limit = 50) {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { booking: { include: { traveler: true, service: true } } },
    });
  }
}