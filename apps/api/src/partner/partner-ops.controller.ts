import { Controller, Get, Post, Param, Query, Req, UseGuards, ParseUUIDPipe, BadRequestException } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PartnerGuard } from "../common/guards/partner.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

@ApiTags("partner-services-ops")
@ApiBearerAuth()
@UseGuards(PartnerGuard)
@Controller("partner-services")
export class PartnerServicesOpsController {
  constructor(private readonly prisma: PrismaService) {}

  private async ownService(id: string, partnerId: string) {
    const s = await this.prisma.service.findUnique({ where: { id } });
    if (!s || s.providerId !== partnerId) throw new BadRequestException({ code: "NOT_FOUND", message: "Service not found for this partner" });
    return s;
  }

  @Post(":id/deactivate")
  @Audit("partner.service_deactivate", "service")
  async deactivate(@Req() req: any, @Param("id", new ParseUUIDPipe()) id: string) {
    const s = await this.ownService(id, req.partnerUser.partnerId);
    await this.prisma.service.update({ where: { id: s.id }, data: { status: "INACTIVE" as any } });
    return { ok: true, status: "INACTIVE" };
  }

  @Post(":id/activate")
  @Audit("partner.service_activate", "service")
  async activate(@Req() req: any, @Param("id", new ParseUUIDPipe()) id: string) {
    const s = await this.ownService(id, req.partnerUser.partnerId);
    await this.prisma.service.update({ where: { id: s.id }, data: { status: "ACTIVE" as any } });
    return { ok: true, status: "ACTIVE" };
  }
}

@ApiTags("partner-analytics")
@ApiBearerAuth()
@UseGuards(PartnerGuard)
@Controller("partner-analytics")
export class PartnerAnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("overview")
  async overview(@Req() req: any, @Query("period") period = "month", @Query("from") fromQ?: string, @Query("to") toQ?: string) {
    const now = new Date();
    let from: Date;
    let to: Date | null = null;
    if (period === "day") from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (period === "week") { from = new Date(now); from.setDate(from.getDate() - 7); }
    else if (period === "custom" && fromQ) { from = new Date(fromQ); to = toQ ? new Date(toQ) : null; }
    else from = new Date(now.getFullYear(), now.getMonth(), 1);

    const services = await this.prisma.service.findMany({ where: { providerId: req.partnerUser.partnerId }, select: { id: true } });
    const ids = services.map((s) => s.id);

    const bookings = await this.prisma.booking.findMany({
      where: { serviceId: { in: ids }, createdAt: { gte: from, ...(to ? { lte: to } : {}) } },
      select: { status: true, totalMinor: true, currency: true },
    });

    const counts = { total: bookings.length, new: 0, confirmed: 0, completed: 0, cancelled: 0 };
    let grossMinor = 0;
    const currency = bookings[0]?.currency || "EGP";
    for (const b of bookings) {
      if (["DRAFT", "PENDING_APPROVAL", "PAYMENT_PENDING", "CONFIRMING"].includes(b.status)) counts.new++;
      if (["CONFIRMED", "CONFIRMING", "COMPLETED"].includes(b.status)) counts.confirmed++;
      if (b.status === "COMPLETED") counts.completed++;
      if (["CANCELLED", "CANCEL_REQUESTED"].includes(b.status)) counts.cancelled++;
      if (!["CANCELLED", "CANCEL_REQUESTED", "REJECTED", "FAILED"].includes(b.status)) grossMinor += b.totalMinor;
    }

    return { period, from: from.toISOString(), to: to?.toISOString() ?? null, counts, revenue: { grossMinor, currency } };
  }
}
