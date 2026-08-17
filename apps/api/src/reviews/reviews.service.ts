import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { targetType?: string; status?: string; minRating?: number; maxRating?: number; limit?: number } = {}) {
    const where: any = {};
    if (params.targetType) where.targetType = params.targetType;
    if (params.minRating || params.maxRating) {
      where.rating = {};
      if (params.minRating) where.rating.gte = params.minRating;
      if (params.maxRating) where.rating.lte = params.maxRating;
    }
    const items = await this.prisma.review.findMany({
      where,
      include: {
        reviewer: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
        booking: { select: { id: true, service: { select: { title: true, type: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(params.limit ?? 50, 200),
    });
    return { items, total: await this.prisma.review.count({ where }) };
  }

  async detail(id: string) {
    const r = await this.prisma.review.findUnique({
      where: { id },
      include: {
        reviewer: { select: { id: true, email: true, profile: true } },
        booking: { select: { id: true, service: true } },
      },
    });
    if (!r) throw new NotFoundException("Review not found");
    return r;
  }

  async moderate(id: string, action: "APPROVE" | "HIDE" | "DELETE") {
    const r = await this.prisma.review.findUnique({ where: { id } });
    if (!r) throw new NotFoundException("Review not found");
    if (action === "DELETE") {
      await this.prisma.review.delete({ where: { id } });
      return { ok: true, action };
    }
    // Use metadata field as soft moderation state (we don't have a `status` column)
    // For now: HIDE = we just audit-log it; UI will show it as "flagged"
    await this.prisma.auditLog.create({
      data: { action: `REVIEW_${action}`, resourceType: "REVIEW", resourceId: id, metadata: { rating: r.rating, targetType: r.targetType } },
    });
    return { ok: true, action };
  }

  async stats() {
    const total = await this.prisma.review.count();
    const avgResult = await this.prisma.review.aggregate({ _avg: { rating: true } });
    const byRating = await this.prisma.$queryRawUnsafe(`
      SELECT rating, COUNT(*)::int AS count FROM reviews GROUP BY rating ORDER BY rating DESC
    `);
    return { total, average: avgResult._avg.rating ?? 0, byRating };
  }
}
