import { Controller, Get, Query, Req, UseGuards, UnauthorizedException } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { UsersService } from "./users.service.js";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { ListUsersQueryDto } from "./dto/users.dto.js";
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
}