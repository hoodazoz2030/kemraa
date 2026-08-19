import { Controller, Get, Post, Body, UseGuards, Req, Param, SetMetadata, Logger } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { randomBytes } from "node:crypto";

/**
 * §19 — Partner referral links management.
 */
@ApiTags("partner-referrals")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("partner-referrals")
export class PartnerReferralsController {
  private readonly logger = new Logger(PartnerReferralsController.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getProviderId(userId: string): Promise<string | null> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, role: "PARTNER_ADMIN" as any, status: "ACTIVE" as any },
    });
    return membership?.organizationId ?? null;
  }

  private genCode(): string {
    return randomBytes(6).toString("hex").toUpperCase();
  }

  @Get()
  @SetMetadata("roles", ["CUSTOMER"])
  async list(@Req() req: any) {
    const providerId = await this.getProviderId(req.user.sub);
    if (!providerId) return { items: [], total: 0 };

    const items = await this.prisma.referralLink.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { items, total: items.length };
  }

  @Post()
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("partner.referral.create", "referral")
  async create(@Req() req: any, @Body() body: { campaign?: string; expiresAt?: string } = {}) {
    const providerId = await this.getProviderId(req.user.sub);
    if (!providerId) return { error: { code: "NO_ORGANIZATION" } };

    try {
      let code = this.genCode();
      // Ensure unique
      let existing = await this.prisma.referralLink.findUnique({ where: { code } });
      while (existing) {
        code = this.genCode();
        existing = await this.prisma.referralLink.findUnique({ where: { code } });
      }

      const link = await this.prisma.referralLink.create({
        data: {
          providerId,
          code,
          campaign: body.campaign ?? null,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        } as any,
      });

      this.logger.log(`Referral link created: ${link.code} for provider ${providerId}`);
      return {
        ...link,
        url: `https://kemraa.com/ref/${link.code}`,
      };
    } catch (err: any) {
      return { error: { code: "CREATE_FAILED", message: err.message } };
    }
  }

  /**
   * Track a referral event (public endpoint — called from landing page).
   */
  @Post("track/:code")
  @Audit("referral.track", "referral")
  async track(@Param("code") code: string, @Body() body: { eventType: string; userId?: string; bookingId?: string; metadata?: any }) {
    const link = await this.prisma.referralLink.findUnique({ where: { code } });
    if (!link) return { error: { code: "NOT_FOUND" } };
    if (!link.isActive) return { error: { code: "INACTIVE" } };
    if (link.expiresAt && link.expiresAt < new Date()) return { error: { code: "EXPIRED" } };

    // Increment counters
    const updateData: any = {};
    if (body.eventType === "CLICK") updateData.clickCount = { increment: 1 };
    if (body.eventType === "BOOKING") updateData.convertCount = { increment: 1 };

    const [event] = await this.prisma.$transaction([
      this.prisma.referralEvent.create({
        data: {
          linkId: link.id,
          eventType: body.eventType,
          userId: body.userId ?? null,
          bookingId: body.bookingId ?? null,
          metadata: (body.metadata ?? {}) as any,
        } as any,
      }),
      this.prisma.referralLink.update({
        where: { id: link.id },
        data: updateData,
      }),
    ]);

    return { success: true, eventId: event.id };
  }

  /**
   * Referral stats for partner.
   */
  @Get("stats")
  @SetMetadata("roles", ["CUSTOMER"])
  async stats(@Req() req: any) {
    const providerId = await this.getProviderId(req.user.sub);
    if (!providerId) return { totalClicks: 0, totalConversions: 0, links: 0, conversionRate: 0 };

    const links = await this.prisma.referralLink.findMany({ where: { providerId } });
    const totalClicks = links.reduce((s, l) => s + l.clickCount, 0);
    const totalConversions = links.reduce((s, l) => s + l.convertCount, 0);
    const conversionRate = totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 10000) / 100 : 0;

    return {
      links: links.length,
      totalClicks,
      totalConversions,
      conversionRate,
      formatted: `${conversionRate}%`,
    };
  }

  /**
   * Deactivate a referral link.
   */
  @Post(":id/deactivate")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("partner.referral.deactivate", "referral")
  async deactivate(@Req() req: any, @Param("id") id: string) {
    const providerId = await this.getProviderId(req.user.sub);
    const link = await this.prisma.referralLink.findFirst({ where: { id, providerId: providerId ?? "__none__" } });
    if (!link) return { error: { code: "NOT_FOUND" } };
    return await this.prisma.referralLink.update({ where: { id }, data: { isActive: false } });
  }
}
