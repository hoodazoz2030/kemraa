import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { SupportService } from "./support.service.js";

@ApiTags("support")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("support")
export class SupportController {
  constructor(private readonly support: SupportService) {}

  // Customer
  @Get("me")
  myTickets(@Req() req: Request) {
    return this.support.myTickets((req as any).user.sub);
  }

  @Get("me/:id")
  myDetail(@Req() req: Request, @Param("id") id: string) {
    return this.support.getDetail(id, (req as any).user.sub, false);
  }

  @Post("me/:id/reply")
  myReply(@Req() req: Request, @Param("id") id: string, @Body() body: { body: string }) {
    return this.support.addReply(id, (req as any).user.sub, body.body, false);
  }

  // Admin
  @Get("admin")
  @Roles("ADMIN", "STAFF")
  adminList(
    @Query("status") status?: string,
    @Query("priority") priority?: string,
    @Query("assignedTo") assignedTo?: string,
  ) {
    return this.support.adminList({ status, priority, assignedTo });
  }

  @Get("admin/:id")
  @Roles("ADMIN", "STAFF")
  adminDetail(@Param("id") id: string) {
    return this.support.getDetail(id, undefined, true);
  }

  @Post("admin/:id/reply")
  @Roles("ADMIN", "STAFF")
  adminReply(@Req() req: Request, @Param("id") id: string, @Body() body: { body: string }) {
    return this.support.addReply(id, (req as any).user.sub, body.body, true);
  }

  @Patch("admin/:id")
  @Roles("ADMIN", "STAFF")
  adminUpdate(@Param("id") id: string, @Body() update: { status?: string; priority?: string; assignedTo?: string | null }) {
    return this.support.adminUpdate(id, update);
  }

  @Post("admin/seed")
  @Roles("ADMIN")
  async seed(@Req() req: Request) {
    const userId = (req as any).user.sub;
    return this.support.seedSample(userId);
  }
}