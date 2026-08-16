import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { ListAuditLogsDto } from "./dto/audit-logs.dto.js";

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ListAuditLogsDto) {
    const where: any = {};
    if (q.action) where.action = q.action;
    if (q.resourceType) where.resourceType = q.resourceType;
    if (q.actorId) where.actorId = q.actorId;
    if (q.resourceId) where.resourceId = q.resourceId;
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = new Date(q.from);
      if (q.to) where.createdAt.lte = new Date(q.to);
    }
    const limit = Math.min(q.limit ?? 50, 200);
    const offset = q.offset ?? 0;
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: { email: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } }
        }
      },
      orderBy: { createdAt: "desc" },
        take: limit,
        skip: q.offset ?? 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, limit, offset };
  }
}