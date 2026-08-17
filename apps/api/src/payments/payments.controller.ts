import { Controller, Post, Get, Body, Headers, RawBodyRequest, Req, UseGuards, Query, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
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

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("intent")
  @Audit("payment.create", "payment")
  createIntent(@Req() req: Request, @Body() dto: CreatePaymentIntentDto) {
    return this.payments.createPaymentIntent((req as any).user.sub, dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
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

  @Get("admin/summary")


  @Roles("SUPER_ADMIN", "ADMIN")
  summary(@Query("from") from?: string, @Query("to") to?: string) {
    return this.payments.adminSummary(from, to);
  }

  @Get("admin/commissions")
  @Roles("SUPER_ADMIN", "ADMIN")
  commissions(@Query("from") from?: string, @Query("to") to?: string) {
    return this.payments.commissionPayout(from, to);
  }

  @Get("admin/tax-filing")
  @Roles("SUPER_ADMIN", "ADMIN")
  taxFiling(@Query("month") month: string) {
    return this.payments.taxFiling(month);
  }

  @Get("admin/export/csv")
  @Roles("SUPER_ADMIN", "ADMIN")
  async exportCsv(@Res() res: any, @Query("from") from?: string, @Query("to") to?: string) {
    const csv = await this.payments.exportFinanceCSV(from, to);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="kemraa-finance-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  }
}