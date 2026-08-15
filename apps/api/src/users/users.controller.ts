import { Controller, Get, Patch, Param, Query, Req, Body, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe, UnauthorizedException } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { UsersService } from "./users.service.js";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { ListUsersQueryDto, UpdateUserDto, UpdateRolesDto } from "./dto/users.dto.js";
import { Request } from "express";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "OPERATIONS", "SUPPORT"];

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("me")
  @ApiOperation({ summary: "Get current user profile" })
  me(@Req() req: Request) {
    const user = (req as any).user;
    if (!user?.sub) throw new UnauthorizedException({ code: "AUTH_REQUIRED" });
    return this.users.me(user.sub);
  }

  @Get()
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: "List all users (admin only)" })
  list(@Query() query: ListUsersQueryDto) {
    return this.users.list(query);
  }
  @Get(":id")
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: "Get user detail (admin only)" })
  getDetail(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.users.getDetail(id);
  }

  @Patch(":id/status")
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Suspend/Activate/Deactivate user" })
  updateStatus(
    @Req() req: Request,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.updateStatus((req as any).user.sub, id, dto.status!, dto.reason);
  }

  @Patch(":id/roles")
  @Roles("ADMIN", "SUPER_ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update user roles" })
  setRoles(
    @Req() req: Request,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRolesDto,
  ) {
    return this.users.setRoles((req as any).user.sub, id, dto.roles);
  }
}