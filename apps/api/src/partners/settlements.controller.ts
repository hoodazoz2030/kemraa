import { Body, Controller, Get, Param, Post, Query, UseGuards, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PartnersService } from "./partners.service.js";

@ApiTags("settlements")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("settlements")
export class SettlementsController {
  constructor(private readonly svc: PartnersService) {}

  @Get()
  list(@Query() q: any) { return this.svc.listSettlements(q); }

  @Get("stats")
  stats() { return this.svc.settlementsStats(); }

  @Post(":id/approve")
  @Roles("SUPER_ADMIN", "ADMIN")
  @Audit("settlement.approve", "settlement")
  approve(@Param("id", new ParseUUIDPipe()) id: string) { return this.svc.approveSettlement(id); }

  @Post(":id/pay")
  @Roles("SUPER_ADMIN")
  @Audit("settlement.pay", "settlement")
  pay(@Param("id", new ParseUUIDPipe()) id: string) { return this.svc.paySettlement(id); }
}
