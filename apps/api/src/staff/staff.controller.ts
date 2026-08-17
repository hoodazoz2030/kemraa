import { Body, Controller, Post, Get, Patch, Delete, Param, Req, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { StaffService } from "./staff.service.js";
import { Request } from "express";

@ApiTags("staff")
@Controller("staff")
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  // ===== PUBLIC: single-field access login =====
  @Post("access-login")
  @HttpCode(HttpStatus.OK)
  accessLogin(@Body() b: { code: string; deviceId: string }, @Req() req: Request) {
    return this.staff.accessLogin(b.code, b.deviceId, req.headers["user-agent"] ?? "unknown");
  }

  // ===== SUPER_ADMIN only: management =====
  @Get()
  @ApiBearerAuth() @UseGuards(RolesGuard) @Roles("SUPER_ADMIN")
  list() { return this.staff.listStaff(); }

  @Post()
  @ApiBearerAuth() @UseGuards(RolesGuard) @Roles("SUPER_ADMIN") @Audit("staff.create", "user") @HttpCode(HttpStatus.CREATED)
  create(@Body() b: any) { return this.staff.createStaff(b); }

  @Post(":id/regenerate-code")
  @ApiBearerAuth() @UseGuards(RolesGuard) @Roles("SUPER_ADMIN") @Audit("staff.regen_code", "user")
  regenerate(@Param("id", new ParseUUIDPipe()) id: string) { return this.staff.regenerateCode(id); }

  @Post(":id/suspend")
  @ApiBearerAuth() @UseGuards(RolesGuard) @Roles("SUPER_ADMIN") @Audit("staff.suspend", "user")
  suspend(@Param("id", new ParseUUIDPipe()) id: string) { return this.staff.toggleLock(id, true); }

  @Post(":id/reactivate")
  @ApiBearerAuth() @UseGuards(RolesGuard) @Roles("SUPER_ADMIN") @Audit("staff.reactivate", "user")
  reactivate(@Param("id", new ParseUUIDPipe()) id: string) { return this.staff.toggleLock(id, false); }

  @Patch(":id")
  @ApiBearerAuth() @UseGuards(RolesGuard) @Roles("SUPER_ADMIN") @Audit("staff.update", "user")
  update(@Param("id", new ParseUUIDPipe()) id: string, @Body() b: any) { return this.staff.updateStaff(id, b); }

  @Delete(":id")
  @ApiBearerAuth() @UseGuards(RolesGuard) @Roles("SUPER_ADMIN") @Audit("staff.delete", "user") @HttpCode(HttpStatus.OK)
  remove(@Param("id", new ParseUUIDPipe()) id: string) { return this.staff.deleteStaff(id); }
}
