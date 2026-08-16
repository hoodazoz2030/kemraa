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

  @Post("check-device")
  @HttpCode(HttpStatus.OK)
  checkDevice(@Body() b: { email: string; deviceId: string }, @Req() req: Request) {
    return this.staff.checkDevice(b.email, b.deviceId, req.headers["user-agent"] ?? "unknown");
  }

  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() b: { email: string; code: string; deviceId: string; deviceName: string }) {
    return this.staff.verifyOtp(b.email, b.code, b.deviceId, b.deviceName);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() b: { username: string; password: string; deviceId: string; preToken?: string }, @Req() req: Request) {
    return this.staff.login(b.username, b.password, b.deviceId, req.headers["user-agent"] ?? "unknown", b.preToken);
  }

  @Get()
  @ApiBearerAuth() @UseGuards(RolesGuard) @Roles("SUPER_ADMIN")
  list() { return this.staff.listStaff(); }

  @Post()
  @ApiBearerAuth() @UseGuards(RolesGuard) @Roles("SUPER_ADMIN") @Audit("staff.create", "user") @HttpCode(HttpStatus.CREATED)
  create(@Body() b: any) { return this.staff.createStaff(b); }

  @Patch(":id")
  @ApiBearerAuth() @UseGuards(RolesGuard) @Roles("SUPER_ADMIN") @Audit("staff.update", "user")
  update(@Param("id", new ParseUUIDPipe()) id: string, @Body() b: any) { return this.staff.updateStaff(id, b); }

  @Delete(":id")
  @ApiBearerAuth() @UseGuards(RolesGuard) @Roles("SUPER_ADMIN") @Audit("staff.delete", "user") @HttpCode(HttpStatus.OK)
  remove(@Param("id", new ParseUUIDPipe()) id: string) { return this.staff.deleteStaff(id); }
}
