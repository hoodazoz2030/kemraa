import { Controller, Get, Post, Body, Param, Req, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe, BadRequestException } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PartnerGuard } from "../common/guards/partner.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

@ApiTags("partner-support")
@ApiBearerAuth()
@UseGuards(PartnerGuard)
@Controller("partner-support")
export class PartnerSupportController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Audit("partner.support_create", "ticket")
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() b: { category: string; subject: string; body: string; priority?: string }) {
    const ticket = await this.prisma.supportTicket.create({
      data: { userId: req.partnerUser.userId, category: b.category || "GENERAL", subject: b.subject, body: b.body, priority: (b.priority as any) ?? "MEDIUM" },
    });
    return ticket;
  }

  @Get()
  async list(@Req() req: any) {
    const items = await this.prisma.supportTicket.findMany({ where: { userId: req.partnerUser.userId }, orderBy: { createdAt: "desc" }, include: { _count: { select: { replies: true } } } });
    return { items };
  }

  @Get(":id")
  async detail(@Req() req: any, @Param("id", new ParseUUIDPipe()) id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({ where: { id, userId: req.partnerUser.userId }, include: { replies: { orderBy: { createdAt: "asc" } } } });
    if (!ticket) throw new BadRequestException({ code: "NOT_FOUND" });
    return ticket;
  }

  @Post(":id/reply")
  async reply(@Req() req: any, @Param("id", new ParseUUIDPipe()) id: string, @Body() b: { body: string }) {
    const ticket = await this.prisma.supportTicket.findFirst({ where: { id, userId: req.partnerUser.userId } });
    if (!ticket) throw new BadRequestException({ code: "NOT_FOUND" });
    const r = await this.prisma.supportReply.create({ data: { ticketId: id, authorId: req.partnerUser.userId, body: b.body, isStaff: false } });
    return r;
  }
}
