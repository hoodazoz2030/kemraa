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

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { username: string; password: string }, @Req() req: Request) {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const ua = req.headers["user-agent"] ?? "unknown";
    return this.staff.login(body.username, body.password, ip, ua);
  }

  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: { userId: string; code: string; fingerprint: string; deviceName: string }) {
    return this.staff.verifyOtp(body.userId, body.code, body.fingerprint, body.deviceName);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN")
  list() {
    return this.staff.listStaff();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN")
  @Audit("staff.create", "user")
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: { username: string; password: string; email: string; fullName?: string }) {
    return this.staff.createStaff(body);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN")
  @Audit("staff.update", "user")
  update(@Param("id", new ParseUUIDPipe()) id: string, @Body() body: { status?: string; role?: string; password?: string }) {
    return this.staff.updateStaff(id, body);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN")
  @Audit("staff.delete", "user")
  @HttpCode(HttpStatus.OK)
  remove(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.staff.deleteStaff(id);
  }
}
