import { Body, Controller, Get, Param, Post, Query, Req, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PaymentStateService, PAYMENT_TRANSITIONS } from "./payments-state.service.js";

@ApiTags("payments-state")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("admin/payments-state")
export class PaymentsStateController {
  constructor(private readonly svc: PaymentStateService) {}

  @Get("machine")
  getMachine() { return PAYMENT_TRANSITIONS; }

  @Get("stats")
  @Roles("SUPER_ADMIN", "ADMIN", "FINANCE")
  stats() { return this.svc.stats(); }

  @Get()
  @Roles("SUPER_ADMIN", "ADMIN", "FINANCE", "OPERATIONS", "SUPPORT")
  list(@Query() q: any) { return this.svc.listPayments(q); }

  @Get(":id")
  @Roles("SUPER_ADMIN", "ADMIN", "FINANCE", "OPERATIONS", "SUPPORT")
  detail(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.svc.getDetailWithHistory(id);
  }

  @Get(":id/history")
  @Roles("SUPER_ADMIN", "ADMIN", "FINANCE")
  history(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.svc.getHistory(id);
  }

  @Get(":id/ledger")
  @Roles("SUPER_ADMIN", "ADMIN", "FINANCE")
  ledger(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.svc.getLedger(id);
  }

  @Post(":id/transition")
  @Roles("SUPER_ADMIN", "ADMIN", "FINANCE")
  @Audit("payment.state.transition", "payment")
  @HttpCode(HttpStatus.OK)
  transition(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() b: { toStatus: string; reason?: string; metadata?: any; refundAmountMinor?: number },
    @Req() req: any,
  ) {
    return this.svc.transition(id, b.toStatus, {
      actorId: req.user?.sub ?? req.user?.userId,
      actorType: "STAFF",
      actorRole: req.user?.roles?.[0] ?? "FINANCE",
      reason: b.reason,
      metadata: b.metadata,
      refundAmountMinor: b.refundAmountMinor,
      ip: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    });
  }
}
