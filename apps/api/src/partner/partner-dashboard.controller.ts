import { Controller, Get, UseGuards, Req, Query, SetMetadata } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §19 — Partner dashboard: stats + earnings (commission) + booking counts.
 */
@ApiTags("partner-dashboard")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("partner-dashboard")
export class PartnerDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  private async getProviderId(userId: string): Promise<string | null> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, role: "PARTNER_ADMIN" as any, status: "ACTIVE" as any },
    });
    return membership?.organizationId ?? null;
  }

  /**
   * Aggregate stats: total bookings, by status, revenue.
   */
  @Get("stats")
  @SetMetadata("roles", ["CUSTOMER"])
  async stats(@Req() req: any) {
    const providerId = await this.getProviderId(req.user.sub);
    if (!providerId) {
      return {
        totalBookings: 0,
        byStatus: {},
        revenueMinor: 0,
        currency: "EGP",
        pendingCount: 0,
      };
    }

    const [byStatus, total, payments] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ["status"],
        where: { providerId },
        _count: { id: true },
      }),
      this.prisma.booking.count({ where: { providerId } }),
      this.prisma.payment.findMany({
        where: {
          booking: { providerId },
          status: { in: ["CAPTURED", "SETTLED"] as any },
        },
        select: { amountMinor: true, currency: true },
      }),
    ]);

    const statusCounts = byStatus.reduce((acc: any, s: any) => {
      acc[s.status] = s._count.id;
      return acc;
    }, {} as Record<string, number>);

    const revenueMinor = payments.reduce((sum, p) => sum + p.amountMinor, 0);
    const currency = payments[0]?.currency || "EGP";
    const pendingCount = (statusCounts["PENDING_APPROVAL"] || 0);

    return {
      totalBookings: total,
      byStatus: statusCounts,
      revenueMinor,
      currency,
      formattedRevenue: `${currency} ${(revenueMinor / 100).toFixed(2)}`,
      pendingCount,
      confirmedCount: (statusCounts["CONFIRMED"] || 0) + (statusCounts["COMPLETED"] || 0),
      rejectedCount: statusCounts["REJECTED"] || 0,
    };
  }

  /**
   * Earnings: commission entries earned by partner.
   * beneficiaryType = 'PROVIDER' and beneficiaryId = providerId.
   */
  @Get("earnings")
  @SetMetadata("roles", ["CUSTOMER"])
  async earnings(@Req() req: any, @Query() q: any) {
    const providerId = await this.getProviderId(req.user.sub);
    if (!providerId) return { items: [], total: 0, totalMinor: 0 };

    const where: any = {
      beneficiaryType: "PROVIDER",
      beneficiaryId: providerId,
    };
    if (q.status) where.status = q.status;

    const items = await this.prisma.commissionEntry.findMany({
      where,
      include: {
        booking: { select: { id: true, totalMinor: true, currency: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Number(q.limit) || 50, 200),
    });

    const totalMinor = items.reduce((sum, e) => sum + e.amountMinor, 0);

    return {
      items,
      total: items.length,
      totalMinor,
      currency: items[0]?.currency || "EGP",
      formatted: `${items[0]?.currency || "EGP"} ${(totalMinor / 100).toFixed(2)}`,
    };
  }

  /**
   * Recent activity: last state transitions.
   */
  @Get("activity")
  @SetMetadata("roles", ["CUSTOMER"])
  async activity(@Req() req: any) {
    const providerId = await this.getProviderId(req.user.sub);
    if (!providerId) return { items: [] };

    const history = await this.prisma.bookingStateHistory.findMany({
      where: { booking: { providerId } },
      include: {
        booking: { select: { id: true, status: true, totalMinor: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return { items: history };
  }
}
