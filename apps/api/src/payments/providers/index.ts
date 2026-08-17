import { PaymentProvider } from "./payment-provider.interface.js";
import { FawryProvider } from "./fawry.provider.js";
import { StripeProvider } from "./stripe.provider.js";

export function buildPaymentProvider(provider: string, apiKey: string): PaymentProvider {
  switch (provider.toUpperCase()) {
    case "FAWRY": return new FawryProvider(apiKey);
    case "STRIPE": return new StripeProvider(apiKey);
    default: throw new Error(`Unknown payment provider: ${provider}`);
  }
}
