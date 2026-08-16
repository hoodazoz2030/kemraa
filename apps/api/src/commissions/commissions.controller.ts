import { Body, Controller, Get, Param, Patch, Post, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { CommissionsService } from "./commissions.service.js";

const FINANCE_ROLES = ["ADMIN", "SUPER_ADMIN", "FINANCE"];

@ApiTags("commissions")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("commissions")
export class CommissionsController {
  constructor(private readonly commissions: CommissionsService) {}

  @Get("rules")
  @Roles(...FINANCE_ROLES)
  listRules() { return this.commissions.listRules(); }

  @Post("rules")
  @Audit("commission.rule.create", "commission_rule")
  @Roles("ADMIN", "SUPER_ADMIN")
  @HttpCode(HttpStatus.CREATED)
  createRule(@Body() body: any) { return this.commissions.createRule(body); }

  @Patch("rules/:id")
  @Audit("commission.rule.update", "commission_rule")
  @Roles("ADMIN", "SUPER_ADMIN")
  updateRule(@Param("id", new ParseUUIDPipe()) id: string, @Body() body: any) {
    return this.commissions.updateRule(id, body);
  }

  @Get("entries")
  @Roles(...FINANCE_ROLES)
  listEntries() { return this.commissions.listEntries(); }

  @Post("entries/:id/eligible")
  @Audit("commission.markEligible", "commission_entry")
  @Roles(...FINANCE_ROLES)
  @HttpCode(HttpStatus.OK)
  markEligible(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.commissions.markEligible(id);
  }

  @Post("entries/:id/paid")
  @Audit("commission.markPaid", "commission_entry")
  @Roles(...FINANCE_ROLES)
  @HttpCode(HttpStatus.OK)
  markPaid(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.commissions.markPaid(id);
  }
}
