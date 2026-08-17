import { PaymentProvider, CreatePaymentInput, PaymentResult } from "./payment-provider.interface.js";
import * as crypto from "crypto";

export class FawryProvider implements PaymentProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl = "https://atfawry.fawrystaging.com/ECommerceWeb/Fawry") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  name() { return "FAWRY"; }

  async create(input: CreatePaymentInput): Promise<PaymentResult> {
    // Production: POST /charges/create
    // For dev/mock mode when key starts with 'mock_', we return a stub
    if (this.apiKey.startsWith("mock_")) {
      return {
        providerPaymentId: `fawry_mock_${input.idempotencyKey}`,
        status: "REQUIRES_ACTION",
        redirectUrl: `https://example.com/fawry-pay/${input.idempotencyKey}`,
      };
    }

    const body = {
      chargeRequestID: input.idempotencyKey,
      merchantCode: this.apiKey.split(":")[0] ?? this.apiKey,
      merchantRefNum: input.idempotencyKey,
      paymentExpiry: new Date(Date.now() + 3600_000).toISOString(),
      description: input.description ?? "Kemraa booking",
      paymentMethod: input.methodType === "CARD" ? "CARD" : "PAYATFAWRY",
      amount: input.amountMinor / 100,
      currencyCode: input.currency,
      customer: {
        name: input.metadata?.customerName ?? "Customer",
        mobile: input.metadata?.customerPhone ?? "01000000000",
        email: input.customerEmail ?? "no-reply@kemraa.com",
        description: input.description ?? "booking",
      },
      chargeItems: [{
        itemId: "1",
        description: input.description ?? "booking",
        price: input.amountMinor / 100,
        quantity: 1,
      }],
    };
    const bodyStr = JSON.stringify(body);
    const sig = crypto.createHash("sha256").update(bodyStr + this.apiKey).digest("hex");

    try {
      const res = await fetch(`${this.baseUrl}/charges/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Fawry-Signature": sig },
        body: bodyStr,
      });
      const data: any = await res.json();
      if (!res.ok) throw new Error(`Fawry ${res.status}: ${JSON.stringify(data)}`);
      return {
        providerPaymentId: data.merchantRefNumber ?? input.idempotencyKey,
        status: "REQUIRES_ACTION",
        redirectUrl: data.redirectUrl ?? null,
        raw: data,
      };
    } catch (e: any) {
      return { providerPaymentId: null, status: "FAILED", raw: e.message };
    }
  }

  async capture(id: string) { return { providerPaymentId: id, status: "CAPTURED" as const }; }
  async refund(id: string, amountMinor: number) { return { providerPaymentId: id, status: "REFUND_PENDING" as const }; }

  verifyWebhookSignature(rawBody: string, signature: string | undefined, secret: string): boolean {
    if (!signature) return false;
    const expected = crypto.createHash("sha256").update(rawBody + secret).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  parseWebhookEvent(rawBody: string) {
    try {
      const ev = JSON.parse(rawBody);
      return {
        type: ev.fawryStatus ?? "UNKNOWN",
        providerPaymentId: ev.merchantRefNumber,
        status: ev.fawryStatus === "PAID" ? "CAPTURED" : "FAILED",
        amountMinor: Math.round((ev.amount ?? 0) * 100),
      };
    } catch { return null; }
  }
}
