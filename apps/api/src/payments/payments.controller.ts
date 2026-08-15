import { Controller, Post, Get, Body, Headers, RawBodyRequest, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PaymentsService } from "./payments.service.js";
import { CreatePaymentIntentDto } from "./dto/payments.dto.js";

@ApiTags("payments")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post("intent")
  @Audit("payment.create", "payment")
  createIntent(@Req() req: Request, @Body() dto: CreatePaymentIntentDto) {
    return this.payments.createPaymentIntent((req as any).user.sub, dto);
  }

  @Post("fawry")
  @Audit("payment.fawry.create", "payment")
  createFawry(@Req() req: Request, @Body() dto: CreatePaymentIntentDto) {
    return this.payments.createFawryPayment((req as any).user.sub, dto);
  }

  @Post("fawry/confirm")
  @Audit("payment.fawry.confirm", "payment")
  confirmFawry(@Req() req: Request, @Body() body: { reference: string }) {
    return this.payments.confirmFawryPayment(body.reference);
  }

  @Get()
  list(@Req() req: Request) {
    return this.payments.listPayments((req as any).user.sub);
  }

  @Get("admin")
  @Roles("ADMIN", "STAFF")
  adminList() {
    return this.payments.adminListAll();
  }

  @Post("webhook/stripe")
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") sig: string,
  ) {
    const rawBody = req.rawBody ?? Buffer.from("");
    return this.payments.handleWebhook(rawBody, sig);
  }
}