import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PartnersService } from "./partners.service.js";

@ApiTags("partners")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("partners")
export class PartnersController {
  constructor(private readonly svc: PartnersService) {}

  @Get() list(@Query() q: any) { return this.svc.list(q); }
  @Get("stats") stats() { return this.svc.stats(); }
  @Get(":id") detail(@Param("id", new ParseUUIDPipe()) id: string) { return this.svc.detail(id); }

  @Post()
  @Roles("SUPER_ADMIN", "ADMIN")
  @Audit("partner.create", "partner")
  @HttpCode(HttpStatus.CREATED)
  create(@Body() b: any) { return this.svc.create(b); }

  @Patch(":id")
  @Roles("SUPER_ADMIN", "ADMIN")
  @Audit("partner.update", "partner")
  update(@Param("id", new ParseUUIDPipe()) id: string, @Body() b: any) { return this.svc.update(id, b); }

  @Post(":id/activate")
  @Roles("SUPER_ADMIN")
  @Audit("partner.activate", "partner")
  activate(@Param("id", new ParseUUIDPipe()) id: string) { return this.svc.setStatus(id, "ACTIVE"); }

  @Post(":id/suspend")
  @Roles("SUPER_ADMIN")
  @Audit("partner.suspend", "partner")
  suspend(@Param("id", new ParseUUIDPipe()) id: string) { return this.svc.setStatus(id, "EXPIRED"); }

  @Post(":id/vehicles")
  @Roles("SUPER_ADMIN", "ADMIN")
  @Audit("partner.vehicle.add", "vehicle")
  addVehicle(@Param("id", new ParseUUIDPipe()) id: string, @Body() b: any) { return this.svc.addVehicle(id, b); }
}
