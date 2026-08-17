import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { SettingsService } from "./settings.service.js";

@ApiTags("settings")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("settings")
export class SettingsController {
  constructor(private readonly svc: SettingsService) {}

  @Get()
  get() { return this.svc.get(); }

  @Patch()
  @Roles("SUPER_ADMIN")
  @Audit("settings.update", "settings")
  update(@Body() body: Record<string, any>) { return this.svc.update(body); }
}
