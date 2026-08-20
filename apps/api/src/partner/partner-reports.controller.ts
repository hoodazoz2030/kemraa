import { Controller, Get, Query, Req, UseGuards, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PartnerGuard } from "../common/guards/partner.guard.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { Response } from "express";

@ApiTags("partner-reports")
@ApiBearerAuth()
@UseGuards(PartnerGuard)
@Controller("partner-reports")
export class PartnerReportsController {
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

  private async ownServices(partnerId: string) {
    const services = await this.prisma.service.findMany({ where: { providerId: partnerId }, select: { id: true, title: true, type: true } });
    return { ids: services.map((s) => s.id), map: new Map(services.map((s) => [s.id, s])) };
  }

  private csvEscape(v: any): string {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  private sendCsv(res: Response, filename: string, rows: string[][]) {
    const csv = rows.map((r) => r.map(this.csvEscape).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(Buffer.from("\uFEFF" + csv, "utf-8"));
  }

  // ===== 1. Bookings Report (§13) =====
  @Get("bookings/csv")
  async bookingsCsv(@Req() req: any, @Res() res: Response, @Query("period") period = "month", @Query("from") fromQ?: string, @Query("to") toQ?: string) {
    const { from, to } = this.dateRange(period, fromQ, toQ);
    const { ids, map } = await this.ownServices(req.partnerUser.partnerId);
    const bookings = await this.prisma.booking.findMany({
      where: { serviceId: { in: ids }, createdAt: { gte: from, ...(to ? { lte: to } : {}) } },
      orderBy: { createdAt: "desc" },
    });
    const travelerIds = [...new Set(bookings.map((b: any) => b.travelerId))];
    const travelers = await this.prisma.user.findMany({ where: { id: { in: travelerIds } }, select: { id: true, email: true } });
    const tMap = new Map(travelers.map((t) => [t.id, t.email]));

    const rows: string[][] = [["booking_id", "service", "type", "customer_email", "status", "total_minor", "currency", "created_at"]];
    for (const b of bookings as any[]) {
      const svc = map.get(b.serviceId);
      rows.push([b.id, svc?.title ?? "", svc?.type ?? "", tMap.get(b.travelerId) ?? "", b.status, String(b.totalMinor), b.currency, b.createdAt.toISOString()]);
    }
    this.sendCsv(res, `bookings-${period}.csv`, rows);
  }

  // ===== 2. Earnings Report (§13) =====
  @Get("earnings/csv")
  async earningsCsv(@Req() req: any, @Res() res: Response, @Query("period") period = "month", @Query("from") fromQ?: string, @Query("to") toQ?: string) {
    const { from, to } = this.dateRange(period, fromQ, toQ);
    const { ids, map } = await this.ownServices(req.partnerUser.partnerId);
    const bookings = await this.prisma.booking.findMany({
      where: { serviceId: { in: ids }, createdAt: { gte: from, ...(to ? { lte: to } : {}) }, status: { notIn: ["CANCELLED", "CANCEL_REQUESTED", "REJECTED", "FAILED"] } },
    });
    const entries = await this.prisma.commissionEntry.findMany({ where: { bookingId: { in: bookings.map((b: any) => b.id) }, status: { not: "REVERSED" } } });
    const commissionByBooking = new Map<string, number>();
    for (const e of entries) commissionByBooking.set(e.bookingId, (commissionByBooking.get(e.bookingId) ?? 0) + e.amountMinor);

    const rows: string[][] = [["booking_id", "service", "gross_minor", "commission_minor", "net_minor", "currency", "date"]];
    for (const b of bookings as any[]) {
      const svc = map.get(b.serviceId);
      const comm = commissionByBooking.get(b.id) ?? 0;
      rows.push([b.id, svc?.title ?? "", String(b.totalMinor), String(comm), String(b.totalMinor - comm), b.currency, b.createdAt.toISOString()]);
    }
    this.sendCsv(res, `earnings-${period}.csv`, rows);
  }

  // ===== 3. Cancellations Report (§13) =====
  @Get("cancellations/csv")
  async cancellationsCsv(@Req() req: any, @Res() res: Response, @Query("period") period = "month", @Query("from") fromQ?: string, @Query("to") toQ?: string) {
    const { from, to } = this.dateRange(period, fromQ, toQ);
    const { ids, map } = await this.ownServices(req.partnerUser.partnerId);
    const bookings = await this.prisma.booking.findMany({
      where: { serviceId: { in: ids }, createdAt: { gte: from, ...(to ? { lte: to } : {}) }, status: { in: ["CANCELLED", "CANCEL_REQUESTED", "REJECTED"] } },
    });
    const travelerIds = [...new Set(bookings.map((b: any) => b.travelerId))];
    const travelers = await this.prisma.user.findMany({ where: { id: { in: travelerIds } }, select: { id: true, email: true } });
    const tMap = new Map(travelers.map((t) => [t.id, t.email]));

    const rows: string[][] = [["booking_id", "service", "customer_email", "status", "total_minor", "currency", "date"]];
    for (const b of bookings as any[]) {
      const svc = map.get(b.serviceId);
      rows.push([b.id, svc?.title ?? "", tMap.get(b.travelerId) ?? "", b.status, String(b.totalMinor), b.currency, b.createdAt.toISOString()]);
    }
    this.sendCsv(res, `cancellations-${period}.csv`, rows);
  }

  // ===== 4. Services Report (§13) =====
  @Get("services/csv")
  async servicesCsv(@Req() req: any, @Res() res: Response) {
    const services = await this.prisma.service.findMany({
      where: { providerId: req.partnerUser.partnerId },
      include: { _count: { select: { bookings: true } } },
    });
    const rows: string[][] = [["service_id", "title", "type", "status", "price_minor", "currency", "bookings_count", "created_at"]];
    for (const s of services as any[]) {
      rows.push([s.id, s.title, s.type, s.status, String(s.priceMinor), s.currency, String(s._count.bookings), s.createdAt.toISOString()]);
    }
    this.sendCsv(res, "services.csv", rows);
  }
}
