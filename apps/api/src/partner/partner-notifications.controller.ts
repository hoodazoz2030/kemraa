import { Controller, Get, Post, Param, Req, UseGuards, ParseUUIDPipe, BadRequestException } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PartnerGuard } from "../common/guards/partner.guard.js";
import { PrismaService } from "../prisma/prisma.service.js";

@ApiTags("partner-notifications")
@ApiBearerAuth()
@UseGuards(PartnerGuard)
@Controller("partner-notifications")
export class PartnerNotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: any) {
    const items = await this.prisma.notification.findMany({ where: { userId: req.partnerUser.userId }, orderBy: { sentAt: "desc" }, take: 50 });
    return { items };
  }

  @Get("unread-count")
  async unread(@Req() req: any) {
    const count = await this.prisma.notification.count({ where: { userId: req.partnerUser.userId, readAt: null } });
    return { count };
  }

  @Post(":id/read")
  async read(@Req() req: any, @Param("id", new ParseUUIDPipe()) id: string) {
    const n = await this.prisma.notification.findFirst({ where: { id, userId: req.partnerUser.userId } });
    if (!n) throw new BadRequestException({ code: "NOT_FOUND" });
    await this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    return { ok: true };
  }

  @Post("read-all")
  async readAll(@Req() req: any) {
    await this.prisma.notification.updateMany({ where: { userId: req.partnerUser.userId, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  }
}
