import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { FinanceAdminService } from "./finance-admin.service.js";

@ApiTags("finance-admin")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("admin/finance")
export class FinanceAdminController {
  constructor(private readonly svc: FinanceAdminService) {}

  @Get("commission-rules")
  @Roles("SUPER_ADMIN", "ADMIN", "FINANCE")
  listRules(@Query() q: any) { return this.svc.listRules(q); }

  @Post("commission-rules")
  @Roles("SUPER_ADMIN", "ADMIN", "FINANCE")
  @Audit("commission_rule.create", "commission_rule")
  @HttpCode(HttpStatus.CREATED)
  createRule(@Body() b: any) { return this.svc.createRule(b); }

  @Patch("commission-rules/:id")
  @Roles("SUPER_ADMIN", "ADMIN", "FINANCE")
  @Audit("commission_rule.update", "commission_rule")
  updateRule(@Param("id", new ParseUUIDPipe()) id: string, @Body() b: any) { return this.svc.updateRule(id, b); }

  @Delete("commission-rules/:id")
  @Roles("SUPER_ADMIN", "FINANCE")
  @Audit("commission_rule.delete", "commission_rule")
  deleteRule(@Param("id", new ParseUUIDPipe()) id: string) { return this.svc.deleteRule(id); }

  @Get("agencies")
  @Roles("SUPER_ADMIN", "ADMIN", "FINANCE")
  listAgencies() { return this.svc.listAgencies(); }

  @Get("agencies/:organizationId/stats")
  @Roles("SUPER_ADMIN", "ADMIN", "FINANCE")
  agencyStats(@Param("organizationId", new ParseUUIDPipe()) organizationId: string) {
    return this.svc.agencyStats(organizationId);
  }

  @Patch("agencies/:organizationId")
  @Roles("SUPER_ADMIN", "ADMIN", "FINANCE")
  @Audit("agency.update", "agency")
  updateAgency(@Param("organizationId", new ParseUUIDPipe()) organizationId: string, @Body() b: any) {
    return this.svc.updateAgency(organizationId, b);
  }
}
