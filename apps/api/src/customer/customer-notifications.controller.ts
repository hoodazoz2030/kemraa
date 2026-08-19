import { Controller, Get, Post, UseGuards, Req, Param, Query, SetMetadata } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { PrismaService } from "../prisma/prisma.service.js";

@ApiTags("customer-notifications")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("customer-notifications")
export class CustomerNotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @SetMetadata("roles", ["CUSTOMER"])
  async list(@Req() req: any, @Query() q: any) {
    const where: any = { userId: req.user.sub };
    if (q.unread === "true") where.readAt = null;

    const items = await this.prisma.notification.findMany({
      where,
      take: Math.min(Number(q.limit) || 50, 100),
    });
    const unreadCount = await this.prisma.notification.count({ where: { userId: req.user.sub, readAt: null } });
    return { items, unreadCount, total: await this.prisma.notification.count({ where }) };
  }

  @Post(":id/read")
  @SetMetadata("roles", ["CUSTOMER"])
  async markRead(@Req() req: any, @Param("id") id: string) {
    const notif = await this.prisma.notification.findFirst({ where: { id, userId: req.user.sub } });
    if (!notif) return { error: { code: "NOT_FOUND" } };
    return await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  @Post("read-all")
  @SetMetadata("roles", ["CUSTOMER"])
  async markAllRead(@Req() req: any) {
    const result = await this.prisma.notification.updateMany({
      where: { userId: req.user.sub, readAt: null },
      data: { readAt: new Date() },
    });
    return { marked: result.count };
  }
}
