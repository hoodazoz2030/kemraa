export type CurrencyCode=string;export interface MoneyInput{amountMinor:number;currency:CurrencyCode;}
export interface CreatePaymentIntentInput{idempotencyKey:string;amount:MoneyInput;methodType:"card"|"wallet"|"cash"|"bank";customerId?:string;}
export interface PaymentIntent{providerPaymentId:string;status:"requires_action"|"authorized"|"failed";clientSecret?:string;amount:MoneyInput;}
export interface CaptureInput{idempotencyKey:string;providerPaymentId:string;}export interface CancelInput{idempotencyKey:string;providerPaymentId:string;}
export interface RefundInput{idempotencyKey:string;providerPaymentId:string;amount:MoneyInput;reason?:string;}
export interface PaymentResult{providerPaymentId:string;status:string;}export interface RefundResult{providerRefundId:string;status:string;}
export interface WebhookEvent{type:string;providerPaymentId:string;payload:unknown;}export interface VerifyWebhookInput{rawBody:string;signature:string;}
export interface PaymentProvider{readonly name:string;createPaymentIntent(i:CreatePaymentIntentInput):Promise<PaymentIntent>;capture(i:CaptureInput):Promise<PaymentResult>;cancel(i:CancelInput):Promise<PaymentResult>;refund(i:RefundInput):Promise<RefundResult>;verifyWebhook(i:VerifyWebhookInput):Promise<WebhookEvent>;}
export class MockPaymentAdapter implements PaymentProvider{readonly name="mock";private idem=new Map<string,unknown>();
  private remember<T>(k:string,f:()=>T):T{if(this.idem.has(k))return this.idem.get(k) as T;const v=f();this.idem.set(k,v);return v;}
  async createPaymentIntent(i:CreatePaymentIntentInput){if(i.amount.amountMinor<0)throw new Error("amount must be non-negative");return this.remember("pi:"+i.idempotencyKey,()=>({providerPaymentId:"mock_pi_"+Math.random().toString(36).slice(2,10),status:"authorized" as const,clientSecret:"mock_cs_"+Math.random().toString(36).slice(2),amount:i.amount}));}
  async capture(i:CaptureInput){return this.remember("cap:"+i.idempotencyKey,()=>({providerPaymentId:i.providerPaymentId,status:"captured"}));}
  async cancel(i:CancelInput){return this.remember("can:"+i.idempotencyKey,()=>({providerPaymentId:i.providerPaymentId,status:"voided"}));}
  async refund(i:RefundInput){if(i.amount.amountMinor<=0)throw new Error("refund must be > 0");return this.remember("ref:"+i.idempotencyKey,()=>({providerRefundId:"mock_rf_"+Math.random().toString(36).slice(2,10),status:"succeeded"}));}
  async verifyWebhook(i:VerifyWebhookInput){return {type:"mock.event",providerPaymentId:"mock_pi_unknown",payload:{raw:i.rawBody}};}}
export function createPaymentProvider(_p:string):PaymentProvider{return new MockPaymentAdapter();}