import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { DriversService } from "./drivers.service.js";

@ApiTags("drivers")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("drivers")
export class DriversController {
  constructor(private readonly svc: DriversService) {}

  @Get() list(@Query() q: any) { return this.svc.list(q); }
  @Get("stats") stats() { return this.svc.stats(); }
  @Get(":id") detail(@Param("id", new ParseUUIDPipe()) id: string) { return this.svc.detail(id); }

  @Post(":id/verify")
  @Roles("SUPER_ADMIN", "ADMIN") @Audit("driver.verify", "driver")
  verify(@Param("id", new ParseUUIDPipe()) id: string, @Body() b: { licenseRef?: string }) { return this.svc.verify(id, b); }

  @Post(":id/reject")
  @Roles("SUPER_ADMIN", "ADMIN") @Audit("driver.reject", "driver")
  reject(@Param("id", new ParseUUIDPipe()) id: string, @Body() b: { reason: string }) { return this.svc.reject(id, b.reason); }

  @Patch(":id/status")
  @Roles("SUPER_ADMIN", "ADMIN") @Audit("driver.status", "driver")
  status(@Param("id", new ParseUUIDPipe()) id: string, @Body() b: { status: string }) { return this.svc.setStatus(id, b.status); }
}
