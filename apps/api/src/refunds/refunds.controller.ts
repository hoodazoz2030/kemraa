import { Body, Controller, Get, Param, Post, Req, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { RefundsService } from "./refunds.service.js";

const FINANCE_ROLES = ["ADMIN", "SUPER_ADMIN", "FINANCE"];

@ApiTags("refunds")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("refunds")
export class RefundsController {
  constructor(private readonly refunds: RefundsService) {}

  @Get("admin")
  @Roles(...FINANCE_ROLES)
  adminList() {
    return this.refunds.adminList();
  }

  @Post()
  @Audit("refund.create", "refund")
  @Roles(...FINANCE_ROLES)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: { paymentId: string; amountMinor: number; reason?: string }) {
    return this.refunds.create(body.paymentId, body.amountMinor, body.reason);
  }

  @Post(":id/process")
  @Audit("refund.process", "refund")
  @Roles(...FINANCE_ROLES)
  @HttpCode(HttpStatus.OK)
  process(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.refunds.transition(id, "PROCESSING");
  }

  @Post(":id/succeed")
  @Audit("refund.succeed", "refund")
  @Roles(...FINANCE_ROLES)
  @HttpCode(HttpStatus.OK)
  succeed(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.refunds.transition(id, "SUCCEEDED");
  }

  @Post(":id/fail")
  @Audit("refund.fail", "refund")
  @Roles(...FINANCE_ROLES)
  @HttpCode(HttpStatus.OK)
  fail(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.refunds.transition(id, "FAILED");
  }
}
