import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(days = 14) {
    const since = new Date(Date.now() - days * 86400000);

    const [payments, bookingsByStatus, usersCount, ticketsCount] = await Promise.all([
      this.prisma.payment.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, amountMinor: true, provider: true, status: true },
      }),
      this.prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.user.count(),
      (this.prisma as any).supportTicket?.count?.().catch(() => 0) ?? 0,
    ]);

    // Revenue by day + by provider (captured/settled only)
    const byDay = new Map<string, number>();
    const byProvider = new Map<string, { count: number; total: number }>();
    let revenue = 0;

    for (const p of payments) {
      if (p.status === "CAPTURED" || p.status === "SETTLED") {
        revenue += p.amountMinor;
        const d = p.createdAt.toISOString().slice(0, 10);
        byDay.set(d, (byDay.get(d) ?? 0) + p.amountMinor);
      }
      const prov = byProvider.get(p.provider) ?? { count: 0, total: 0 };
      prov.count += 1;
      prov.total += p.amountMinor;
      byProvider.set(p.provider, prov);
    }

    const revenueByDay = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, total]) => ({ date, total }));

    const paymentsByProvider = [...byProvider.entries()].map(([provider, v]) => ({
      provider,
      count: v.count,
      total: v.total,
    }));

    // Top services by revenue
    const byService = await this.prisma.booking.groupBy({
      by: ["serviceId"],
      _count: { _all: true },
      _sum: { totalMinor: true },
    });
    const svcIds = byService.map((s) => s.serviceId);
    const services = await this.prisma.service.findMany({
      where: { id: { in: svcIds } },
      select: { id: true, title: true },
    });
    const nameMap = new Map(services.map((s) => [s.id, s.title]));
    const topServices = byService
      .map((s) => ({
        name: nameMap.get(s.serviceId) ?? s.serviceId.slice(0, 8),
        count: s._count._all,
        revenue: s._sum.totalMinor ?? 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totals: {
        revenue,
        bookings: bookingsByStatus.reduce((s, b) => s + b._count._all, 0),
        users: usersCount,
        tickets: ticketsCount,
      },
      revenueByDay,
      paymentsByProvider,
      bookingsByStatus: bookingsByStatus.map((b) => ({ status: b.status, count: b._count._all })),
      topServices,
    };
  }
}