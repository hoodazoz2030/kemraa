import Stripe from "stripe";
import { PaymentProvider, CreatePaymentInput, PaymentResult } from "./payment-provider.interface.js";

export class StripeProvider implements PaymentProvider {
  private readonly stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, { apiVersion: "2024-12-18.acacia" as any });
  }

  name() { return "STRIPE"; }

  async create(input: CreatePaymentInput): Promise<PaymentResult> {
    if (this.stripe._api?.auth ?? this.isMockKey(this.stripe)) {
      // Mock mode fallback (sk_test_*) — we'll let the real SDK handle it
    }
    try {
      const pi = await this.stripe.paymentIntents.create({
        amount: input.amountMinor,
        currency: input.currency.toLowerCase(),
        description: input.description ?? "Kemraa booking",
        metadata: { ...input.metadata, idempotencyKey: input.idempotencyKey },
        receipt_email: input.customerEmail,
        automatic_payment_methods: { enabled: true },
      });
      return {
        providerPaymentId: pi.id,
        status: pi.status === "requires_payment_method" || pi.status === "requires_confirmation" ? "REQUIRES_ACTION" :
                pi.status === "requires_capture" ? "AUTHORIZED" :
                pi.status === "succeeded" ? "CAPTURED" : "CREATED",
        clientSecret: pi.client_secret ?? null,
        raw: pi,
      };
    } catch (e: any) {
      return { providerPaymentId: null, status: "FAILED", raw: e.message };
    }
  }

  private isMockKey(s: any): boolean { return false; }

  async capture(id: string, amountMinor: number): Promise<PaymentResult> {
    const pi = await this.stripe.paymentIntents.capture(id, { amount_to_capture: amountMinor });
    return { providerPaymentId: pi.id, status: pi.status === "succeeded" ? "CAPTURED" : "FAILED" };
  }

  async refund(id: string, amountMinor: number, reason?: string): Promise<PaymentResult> {
    await this.stripe.refunds.create({ payment_intent: id, amount: amountMinor, reason: (reason as any) ?? "requested_by_customer" });
    return { providerPaymentId: id, status: "REFUND_PENDING" };
  }

  verifyWebhookSignature(rawBody: string, signature: string | undefined, secret: string): boolean {
    if (!signature) return false;
    try {
      this.stripe.webhooks.constructEvent(rawBody, signature, secret);
      return true;
    } catch { return false; }
  }

  parseWebhookEvent(rawBody: string) {
    try {
      const ev = JSON.parse(rawBody);
      const pi = ev.data?.object;
      if (!pi) return null;
      const statusMap: Record<string, string> = {
        "payment_intent.succeeded": "CAPTURED",
        "payment_intent.payment_failed": "FAILED",
        "payment_intent.canceled": "VOIDED",
        "charge.refunded": "PARTIALLY_REFUNDED",
      };
      return {
        type: ev.type,
        providerPaymentId: pi.id,
        status: statusMap[ev.type] ?? "UNKNOWN",
        amountMinor: pi.amount ?? 0,
      };
    } catch { return null; }
  }
}
