import { Controller, Get, Param, Query, Req, UseGuards, ParseUUIDPipe, BadRequestException } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PartnerGuard } from "../common/guards/partner.guard.js";
import { PrismaService } from "../prisma/prisma.service.js";

@ApiTags("partner-finance")
@ApiBearerAuth()
@UseGuards(PartnerGuard)
@Controller("partner-finance")
export class PartnerFinanceController {
  constructor(private readonly prisma: PrismaService) {}

  private dateRange(period: string, fromQ?: string, toQ?: string): { from: Date; to: Date | null } {
    const now = new Date();
    let from: Date;
    let to: Date | null = null;
    if (period === "day") from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (period === "week") { from = new Date(now); from.setDate(from.getDate() - 7); }
    else if (period === "custom" && fromQ) { from = new Date(fromQ); to = toQ ? new Date(toQ) : null; }
    else from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to };
  }

  private async ownServiceIds(partnerId: string): Promise<string[]> {
    const s = await this.prisma.service.findMany({ where: { providerId: partnerId }, select: { id: true } });
    return s.map((x) => x.id);
  }

  @Get("entries")
  async listEntries(@Req() req: any, @Query("period") period = "month", @Query("from") fromQ?: string, @Query("to") toQ?: string, @Query("status") status?: string) {
    const { from, to } = this.dateRange(period, fromQ, toQ);
    const serviceIds = await this.ownServiceIds(req.partnerUser.partnerId);

    const where: any = {
      booking: { serviceId: { in: serviceIds } },
      createdAt: { gte: from, ...(to ? { lte: to } : {}) },
    };
    if (status && ["PENDING", "ELIGIBLE", "PAID", "REVERSED"].includes(status)) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.commissionEntry.findMany({
        where,
        include: {
          booking: { select: { id: true, status: true, totalMinor: true, currency: true } },
          rule: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      this.prisma.commissionEntry.count({ where }),
    ]);
    return { items, total, period, from: from.toISOString(), to: to?.toISOString() ?? null };
  }

  @Get("summary")
  async summary(@Req() req: any, @Query("period") period = "month", @Query("from") fromQ?: string, @Query("to") toQ?: string) {
    const { from, to } = this.dateRange(period, fromQ, toQ);
    const serviceIds = await this.ownServiceIds(req.partnerUser.partnerId);

    const bookings = await this.prisma.booking.findMany({
      where: { serviceId: { in: serviceIds }, createdAt: { gte: from, ...(to ? { lte: to } : {}) }, status: { notIn: ["CANCELLED", "CANCEL_REQUESTED", "REJECTED", "FAILED"] } },
      select: { id: true, totalMinor: true, currency: true },
    });

    const entries = await this.prisma.commissionEntry.findMany({
      where: { bookingId: { in: bookings.map((b) => b.id) }, status: { not: "REVERSED" } },
      select: { amountMinor: true, status: true },
    });

    const currency = bookings[0]?.currency || "EGP";
    const grossMinor = bookings.reduce((s, b) => s + b.totalMinor, 0);
    const commissionMinor = entries.reduce((s, e) => s + e.amountMinor, 0);
    const netMinor = grossMinor - commissionMinor;

    const byStatus: any = { PENDING: 0, ELIGIBLE: 0, PAID: 0, REVERSED: 0 };
    for (const e of entries) if (byStatus[e.status] !== undefined) byStatus[e.status] += e.amountMinor;

    return {
      period, from: from.toISOString(), to: to?.toISOString() ?? null, currency,
      gross: { minor: grossMinor, formatted: (grossMinor / 100).toFixed(2) },
      commission: { minor: commissionMinor, formatted: (commissionMinor / 100).toFixed(2) },
      net: { minor: netMinor, formatted: (netMinor / 100).toFixed(2) },
      entriesByStatus: byStatus,
      bookingsCount: bookings.length,
      entriesCount: entries.length,
    };
  }

  @Get("settlements")
  async listSettlements(@Req() req: any, @Query("status") status?: string) {
    const where: any = { partnerId: req.partnerUser.partnerId };
    if (status && ["OPEN", "CLOSED", "APPROVED", "PAID"].includes(status)) where.status = status;
    const items = await this.prisma.settlement.findMany({ where, orderBy: { periodStart: "desc" } });
    return { items };
  }

  @Get("settlements/:id")
  async settlementDetail(@Req() req: any, @Param("id", new ParseUUIDPipe()) id: string) {
    const s = await this.prisma.settlement.findFirst({ where: { id, partnerId: req.partnerUser.partnerId } });
    if (!s) throw new BadRequestException({ code: "NOT_FOUND" });
    const entries = await this.prisma.commissionEntry.findMany({
      where: { booking: { service: { providerId: req.partnerUser.partnerId } }, createdAt: { gte: s.periodStart, lte: s.periodEnd } },
      include: { booking: { select: { id: true, totalMinor: true, currency: true, status: true } } },
    });
    return { ...s, entries, entriesCount: entries.length };
  }

  @Get("overview")
  async overview(@Req() req: any, @Query("period") period = "month", @Query("from") fromQ?: string, @Query("to") toQ?: string) {
    const summary = await this.summary(req, period, fromQ, toQ);
    const settlements = await this.prisma.settlement.findMany({ where: { partnerId: req.partnerUser.partnerId } });
    const openSettlements = settlements.filter((s: any) => s.status === "OPEN" || s.status === "CLOSED");
    const paidSettlements = settlements.filter((s: any) => s.status === "PAID");
    return {
      ...summary,
      settlements: {
        open: openSettlements.length,
        paid: paidSettlements.length,
        totalOpenMinor: openSettlements.reduce((s: number, x: any) => s + x.netMinor, 0),
        totalPaidMinor: paidSettlements.reduce((s: number, x: any) => s + x.netMinor, 0),
      },
    };
  }
}
