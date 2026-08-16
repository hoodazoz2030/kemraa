import { Body, Controller, Get, Param, Patch, Post, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
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
  @Roles("ADMIN", "SUPER_ADMIN")
  @HttpCode(HttpStatus.CREATED)
  createRule(@Body() body: any) { return this.commissions.createRule(body); }

  @Patch("rules/:id")
  @Roles("ADMIN", "SUPER_ADMIN")
  updateRule(@Param("id", new ParseUUIDPipe()) id: string, @Body() body: any) {
    return this.commissions.updateRule(id, body);
  }

  @Get("entries")
  @Roles(...FINANCE_ROLES)
  listEntries() { return this.commissions.listEntries(); }

  @Post("entries/:id/eligible")
  @Roles(...FINANCE_ROLES)
  @HttpCode(HttpStatus.OK)
  markEligible(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.commissions.markEligible(id);
  }

  @Post("entries/:id/paid")
  @Roles(...FINANCE_ROLES)
  @HttpCode(HttpStatus.OK)
  markPaid(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.commissions.markPaid(id);
  }
}
