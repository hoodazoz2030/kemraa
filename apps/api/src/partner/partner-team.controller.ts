import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe, BadRequestException } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PartnerGuard } from "../common/guards/partner.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";
import * as bcrypt from "bcryptjs";

const VALID_ROLES = ["PARTNER_ADMIN", "PARTNER_STAFF", "PARTNER_USER"];
export const PARTNER_PERMISSIONS = ["services.read","services.write","bookings.read","bookings.update","finance.read","users.manage","documents.read","documents.write","support.read","reports.read"];

@ApiTags("partner-team")
@ApiBearerAuth()
@UseGuards(PartnerGuard)
@Controller("partner-team")
export class PartnerTeamController {
  constructor(private readonly prisma: PrismaService) {}

  private ensureAdmin(req: any) {
    if (req.partnerUser.role !== "PARTNER_ADMIN") throw new BadRequestException({ code: "FORBIDDEN", message: "PARTNER_ADMIN only" });
  }

  @Get()
  async list(@Req() req: any) {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: req.partnerUser.partnerId },
      include: { user: { select: { id: true, email: true, username: true, status: true, features: true, createdAt: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } } },
    });
    return { items: members.map((m: any) => ({ userId: m.userId, role: m.role, status: m.status, permissions: (m.user.features as string[]) ?? [], user: m.user })) };
  }

  @Post()
  @Audit("partner.team_create", "user")
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() b: { email: string; password: string; role?: string; permissions?: string[]; firstName?: string; lastName?: string }) {
    this.ensureAdmin(req);
    const role = b.role && VALID_ROLES.includes(b.role) ? b.role : "PARTNER_STAFF";
    if (await this.prisma.user.findUnique({ where: { email: b.email } })) throw new BadRequestException({ code: "EMAIL_TAKEN" });
    const hash = await bcrypt.hash(b.password, 10);
    const perms = (b.permissions ?? ["services.read", "bookings.read"]).filter((p) => PARTNER_PERMISSIONS.includes(p));
    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { email: b.email, passwordHash: hash, status: "ACTIVE" as any, role: "CUSTOMER" as any, accountType: "PARTNER" as any, features: perms as any,
          profile: { create: { firstName: b.firstName ?? "", lastName: b.lastName ?? "" } } },
      });
      await tx.organizationMember.create({ data: { organizationId: req.partnerUser.partnerId, userId: u.id, role: role as any, status: "ACTIVE" as any } });
      return u;
    });
    return { userId: user.id, email: user.email, role, permissions: perms };
  }

  @Patch(":userId")
  @Audit("partner.team_update", "user")
  async update(@Req() req: any, @Param("userId", new ParseUUIDPipe()) userId: string, @Body() b: { role?: string; permissions?: string[]; status?: string }) {
    this.ensureAdmin(req);
    const member = await this.prisma.organizationMember.findFirst({ where: { userId, organizationId: req.partnerUser.partnerId } });
    if (!member) throw new BadRequestException({ code: "NOT_FOUND" });
    const data: any = {};
    if (b.role && VALID_ROLES.includes(b.role)) data.role = b.role;
    if (b.status && ["ACTIVE", "SUSPENDED"].includes(b.status)) data.status = b.status;
    if (Object.keys(data).length) await this.prisma.organizationMember.updateMany({ where: { userId, organizationId: req.partnerUser.partnerId }, data });
    if (b.permissions) await this.prisma.user.update({ where: { id: userId }, data: { features: b.permissions.filter((p) => PARTNER_PERMISSIONS.includes(p)) as any } });
    return { ok: true };
  }

  @Delete(":userId")
  @Audit("partner.team_remove", "user")
  async remove(@Req() req: any, @Param("userId", new ParseUUIDPipe()) userId: string) {
    this.ensureAdmin(req);
    if (userId === req.partnerUser.userId) throw new BadRequestException({ code: "CANNOT_REMOVE_SELF" });
    await this.prisma.organizationMember.updateMany({ where: { userId, organizationId: req.partnerUser.partnerId }, data: { status: "SUSPENDED" as any } });
    return { ok: true };
  }
}
