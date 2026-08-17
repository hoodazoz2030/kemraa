export interface CreatePaymentInput {
  amountMinor: number;
  currency: string;
  methodType: string;
  idempotencyKey: string;
  description?: string;
  metadata?: Record<string, any>;
  customerEmail?: string;
}

export interface PaymentResult {
  providerPaymentId: string | null;
  status: "CREATED" | "REQUIRES_ACTION" | "AUTHORIZED" | "CAPTURED" | "FAILED" | "REFUND_PENDING";
  redirectUrl?: string | null;
  clientSecret?: string | null;
  raw?: any;
}

export interface PaymentProvider {
  name(): string;
  create(input: CreatePaymentInput): Promise<PaymentResult>;
  capture(providerPaymentId: string, amountMinor: number): Promise<PaymentResult>;
  refund(providerPaymentId: string, amountMinor: number, reason?: string): Promise<PaymentResult>;
  verifyWebhookSignature(rawBody: string, signature: string | undefined, secret: string): boolean;
  parseWebhookEvent(rawBody: string): { type: string; providerPaymentId: string; status: string; amountMinor: number } | null;
}
