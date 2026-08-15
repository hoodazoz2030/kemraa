import { Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { NotificationService } from "./notifications.service.js";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  list(
    @Req() req: Request,
    @Query("unreadOnly") unreadOnly?: string,
    @Query("type") type?: string,
  ) {
    return this.notifications.list((req as any).user.sub, {
      unreadOnly: unreadOnly === "true",
      type,
    });
  }

  @Get("unread-count")
  unreadCount(@Req() req: Request) {
    return this.notifications.unreadCount((req as any).user.sub);
  }

  @Patch(":id/read")
  markRead(@Req() req: Request, @Param("id") id: string) {
    return this.notifications.markRead((req as any).user.sub, id);
  }

  @Post("read-all")
  markAllRead(@Req() req: Request) {
    return this.notifications.markAllRead((req as any).user.sub);
  }

  // Admin
  @Get("admin")
  @Roles("ADMIN", "STAFF")
  adminList(@Query("type") type?: string, @Query("userId") userId?: string) {
    return this.notifications.adminList({ type, userId });
  }

  @Post("admin/seed")
  @Roles("ADMIN")
  async seedSample(@Req() req: Request) {
    const userId = (req as any).user.sub;
    const samples = [
      { type: "PAYMENT", title: "Payment captured", body: "EGP 500.00 captured via Fawry" },
      { type: "BOOKING", title: "New booking confirmed", body: "Booking #9217 confirmed" },
      { type: "SYSTEM", title: "System maintenance", body: "Scheduled for tonight 3am EET" },
      { type: "MARKETING", title: "New campaign launched", body: "Summer offer campaign is live" },
      { type: "SUPPORT", title: "New support ticket", body: "Customer asked about refund policy" },
    ];
    for (const s of samples) {
      await this.notifications.create({ userId, channel: "IN_APP", ...s });
    }
    return { seeded: samples.length };
  }
}