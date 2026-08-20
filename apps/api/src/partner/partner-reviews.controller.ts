import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PartnerGuard } from "../common/guards/partner.guard.js";
import { PrismaService } from "../prisma/prisma.service.js";

@ApiTags("partner-reviews")
@ApiBearerAuth()
@UseGuards(PartnerGuard)
@Controller("partner-reviews")
export class PartnerReviewsController {
  constructor(private readonly prisma: PrismaService) {}

  private async serviceIds(partnerId: string): Promise<string[]> {
    const s = await this.prisma.service.findMany({ where: { providerId: partnerId }, select: { id: true } });
    return s.map((x) => x.id);
  }

  @Get()
  async list(@Req() req: any, @Query("page") page = "1", @Query("limit") limit = "20") {
    const ids = await this.serviceIds(req.partnerUser.partnerId);
    const where = { OR: [{ targetType: "SERVICE", targetId: { in: ids } }, { targetType: "PARTNER", targetId: req.partnerUser.partnerId }] };
    const take = Math.min(parseInt(limit) || 20, 100);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, take, skip,
        include: { reviewer: { select: { email: true, username: true } }, booking: { select: { id: true, status: true, totalMinor: true, currency: true } } } }),
      this.prisma.review.count({ where }),
    ]);
    return { items, total };
  }

  @Get("stats")
  async stats(@Req() req: any) {
    const ids = await this.serviceIds(req.partnerUser.partnerId);
    const reviews = await this.prisma.review.findMany({ where: { OR: [{ targetType: "SERVICE", targetId: { in: ids } }, { targetType: "PARTNER", targetId: req.partnerUser.partnerId }] }, select: { rating: true } });
    const count = reviews.length;
    const avg = count ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / count) * 100) / 100 : 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => { if (distribution[r.rating] !== undefined) distribution[r.rating]++; });
    return { count, average: avg, distribution };
  }
}
