import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { OpsService } from "./ops.service.js";

@ApiTags("admin-ops")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("admin")
export class OpsController {
  constructor(private readonly svc: OpsService) {}

  // ---- Content ----
  @Get("content")
  listContent(@Query() q: any) { return this.svc.listContent(q); }

  @Post("content")
  @Roles("SUPER_ADMIN", "ADMIN", "CONTENT")
  @Audit("content.create", "content")
  @HttpCode(HttpStatus.CREATED)
  createContent(@Body() b: any) { return this.svc.createContent(b); }

  @Patch("content/:id")
  @Roles("SUPER_ADMIN", "ADMIN", "CONTENT")
  @Audit("content.update", "content")
  updateContent(@Param("id", new ParseUUIDPipe()) id: string, @Body() b: any) { return this.svc.updateContent(id, b); }

  @Delete("content/:id")
  @Roles("SUPER_ADMIN", "ADMIN")
  @Audit("content.delete", "content")
  deleteContent(@Param("id", new ParseUUIDPipe()) id: string) { return this.svc.deleteContent(id); }

  // ---- THOTH tools + approvals ----
  @Get("thoth/tools")
  listTools() { return this.svc.listTools(); }

  @Post("thoth/tools")
  @Roles("SUPER_ADMIN", "ADMIN")
  @Audit("thoth.tool.create", "thoth")
  @HttpCode(HttpStatus.CREATED)
  createTool(@Body() b: any) { return this.svc.createTool(b); }

  @Patch("thoth/tools/:id")
  @Roles("SUPER_ADMIN", "ADMIN")
  @Audit("thoth.tool.update", "thoth")
  updateTool(@Param("id", new ParseUUIDPipe()) id: string, @Body() b: any) { return this.svc.updateTool(id, b); }

  @Get("thoth/actions")
  listActions(@Query("status") status?: string) { return this.svc.listActions(status); }

  @Post("thoth/actions/simulate")
  @Roles("SUPER_ADMIN", "ADMIN")
  @Audit("thoth.action.simulate", "thoth")
  @HttpCode(HttpStatus.CREATED)
  simulateAction(@Body() b: any) { return this.svc.simulateAction(b); }

  @Post("thoth/actions/:id/approve")
  @Roles("SUPER_ADMIN", "ADMIN")
  @Audit("thoth.action.approve", "thoth")
  approveAction(@Param("id", new ParseUUIDPipe()) id: string, @Body() b: any, @Query() q: any) {
    return this.svc.decideAction(id, true, undefined, b?.note);
  }

  @Post("thoth/actions/:id/reject")
  @Roles("SUPER_ADMIN", "ADMIN")
  @Audit("thoth.action.reject", "thoth")
  rejectAction(@Param("id", new ParseUUIDPipe()) id: string, @Body() b: any) {
    return this.svc.decideAction(id, false, undefined, b?.note);
  }

  // ---- Queues / DLQ ----
  @Get("queues")
  queues() { return this.svc.queuesStatus(); }
}
