import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { IncidentsService } from "./incidents.service.js";

@ApiTags("incidents")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("admin/incidents")
export class IncidentsController {
  constructor(private readonly svc: IncidentsService) {}

  @Get()
  @Roles("SUPER_ADMIN", "ADMIN", "SUPPORT", "OPERATIONS")
  list(@Query() q: any) { return this.svc.list(q); }

  @Get("stats")
  @Roles("SUPER_ADMIN", "ADMIN", "SUPPORT", "OPERATIONS")
  stats() { return this.svc.stats(); }

  @Post()
  @Roles("SUPER_ADMIN", "ADMIN", "SUPPORT", "OPERATIONS")
  @Audit("incident.create", "incident")
  @HttpCode(HttpStatus.CREATED)
  create(@Body() b: any) { return this.svc.create(b); }

  @Patch(":id/status")
  @Roles("SUPER_ADMIN", "ADMIN", "SUPPORT", "OPERATIONS")
  @Audit("incident.status.update", "incident")
  updateStatus(@Param("id", new ParseUUIDPipe()) id: string, @Body() b: { status: string; resolution?: string }) {
    return this.svc.updateStatus(id, b.status, b.resolution);
  }
}
