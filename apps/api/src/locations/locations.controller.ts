import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { LocationsService } from "./locations.service.js";

@ApiTags("locations")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("locations")
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Post("me")
  updateMine(@Req() req: Request, @Body() body: { latitude: number; longitude: number; accuracy?: number; source?: string; battery?: number }) {
    return this.locations.update((req as any).user.sub, body);
  }

  @Get("me")
  getMine(@Req() req: Request) {
    return this.locations.getMine((req as any).user.sub);
  }

  @Get("admin")
  @Roles("ADMIN", "SUPER_ADMIN", "OPERATIONS")
  adminList(@Query("activeMinutes") activeMinutes?: string) {
    return this.locations.adminList(activeMinutes ? parseInt(activeMinutes, 10) : 60);
  }

  @Get("admin/:userId")
  @Roles("ADMIN", "SUPER_ADMIN", "OPERATIONS")
  adminGet(@Param("userId") userId: string) {
    return this.locations.adminGet(userId);
  }

  @Delete("admin/:userId")
  @Roles("ADMIN", "SUPER_ADMIN")
  adminDelete(@Param("userId") userId: string) {
    return this.locations.adminDelete(userId);
  }
}