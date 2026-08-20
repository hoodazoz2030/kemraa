import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe, BadRequestException, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PartnerGuard } from "../common/guards/partner.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

const DRIVER_STATUSES = ["OFFLINE", "ONLINE", "BUSY", "SUSPENDED"];

@ApiTags("partner-drivers")
@ApiBearerAuth()
@UseGuards(PartnerGuard)
@Controller("partner-drivers")
export class PartnerDriversController {
  constructor(private readonly prisma: PrismaService) {}

  private ensureWriteAccess(req: any) {
    if (!["PARTNER_ADMIN", "PARTNER_STAFF"].includes(req.partnerUser.role)) {
      throw new BadRequestException({ code: "FORBIDDEN", message: "Requires ADMIN or STAFF role" });
    }
  }

  // ===== 1. List drivers (§10 - tenant isolation) =====
  @Get()
  async list(@Req() req: any, @Query("status") status?: string) {
    const where: any = { partnerId: req.partnerUser.partnerId };
    if (status && DRIVER_STATUSES.includes(status)) where.status = status;

    const items = await this.prisma.driver.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, username: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
        vehicles: { select: { id: true, plateRef: true, make: true, model: true, status: true } },
        _count: { select: { rides: true } },
      },
      orderBy: { user: { createdAt: "desc" } },
    });

    const stats = {
      total: items.length,
      offline: items.filter((d: any) => d.status === "OFFLINE").length,
      online: items.filter((d: any) => d.status === "ONLINE").length,
      busy: items.filter((d: any) => d.status === "BUSY").length,
      suspended: items.filter((d: any) => d.status === "SUSPENDED").length,
      unverified: items.filter((d: any) => d.verificationStatus === "UNVERIFIED").length,
    };

    return { items, stats };
  }

  // ===== 2. Driver detail =====
  @Get(":userId")
  async detail(@Req() req: any, @Param("userId", new ParseUUIDPipe()) userId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { userId, partnerId: req.partnerUser.partnerId },
      include: {
        user: { select: { id: true, email: true, username: true, profile: true } },
        vehicles: true,
        rides: { take: 10, orderBy: { createdAt: "desc" } },
      },
    });
    if (!driver) throw new BadRequestException({ code: "NOT_FOUND" });
    return driver;
  }

  // ===== 3. Update driver status (§10) =====
  @Patch(":userId/status")
  @Audit("partner.driver_status", "driver")
  async updateStatus(@Req() req: any, @Param("userId", new ParseUUIDPipe()) userId: string, @Body() b: { status: string }) {
    this.ensureWriteAccess(req);
    if (!DRIVER_STATUSES.includes(b.status)) throw new BadRequestException({ code: "INVALID_STATUS" });

    const driver = await this.prisma.driver.findFirst({ where: { userId, partnerId: req.partnerUser.partnerId } });
    if (!driver) throw new BadRequestException({ code: "NOT_FOUND" });

    await this.prisma.driver.update({ where: { userId }, data: { status: b.status as any } });
    return { ok: true, status: b.status };
  }

  // ===== 4. Verify driver (§10) =====
  @Post(":userId/verify")
  @Audit("partner.driver_verify", "driver")
  async verify(@Req() req: any, @Param("userId", new ParseUUIDPipe()) userId: string, @Body() b: { licenseRef?: string }) {
    this.ensureWriteAccess(req);
    const driver = await this.prisma.driver.findFirst({ where: { userId, partnerId: req.partnerUser.partnerId } });
    if (!driver) throw new BadRequestException({ code: "NOT_FOUND" });

    await this.prisma.driver.update({
      where: { userId },
      data: { verificationStatus: "VERIFIED" as any, licenseRef: b.licenseRef ?? driver.licenseRef },
    });
    return { ok: true };
  }

  // ===== 5. Stats =====
  @Get("stats")
  async stats(@Req() req: any) {
    const all = await this.prisma.driver.findMany({
      where: { partnerId: req.partnerUser.partnerId },
      select: { status: true, verificationStatus: true },
    });
    return {
      total: all.length,
      byStatus: {
        OFFLINE: all.filter((d) => d.status === "OFFLINE").length,
        ONLINE: all.filter((d) => d.status === "ONLINE").length,
        BUSY: all.filter((d) => d.status === "BUSY").length,
        SUSPENDED: all.filter((d) => d.status === "SUSPENDED").length,
      },
      verified: all.filter((d) => d.verificationStatus === "VERIFIED").length,
      unverified: all.filter((d) => d.verificationStatus === "UNVERIFIED").length,
    };
  }
}
