import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { status?: string; verification?: string; search?: string; limit?: number } = {}) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.verification) where.verificationStatus = params.verification;
    if (params.search) {
      where.user = {
        OR: [
          { email: { contains: params.search, mode: "insensitive" } },
          { profile: { firstName: { contains: params.search, mode: "insensitive" } } },
          { profile: { lastName: { contains: params.search, mode: "insensitive" } } },
        ],
      };
    }
    const items = await this.prisma.driver.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, phone: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
        partner: { select: { organizationId: true } },
        vehicles: { take: 3 },
        _count: { select: { rides: true } },
      },
      orderBy: { user: { createdAt: "desc" } },
      take: Math.min(params.limit ?? 50, 200),
    });
    return { items, total: await this.prisma.driver.count({ where }) };
  }

  async detail(id: string) {
    const d = await this.prisma.driver.findUnique({
      where: { userId: id },
      include: {
        user: { include: { profile: true } },
        partner: true,
        vehicles: true,
        rides: { take: 10, orderBy: { createdAt: "desc" } },
      },
    });
    if (!d) throw new NotFoundException("Driver not found");
    return d;
  }

  async verify(id: string, data: { licenseRef?: string }) {
    return this.prisma.driver.update({
      where: { userId: id },
      data: { verificationStatus: "VERIFIED", licenseRef: data.licenseRef ?? null },
    });
  }

  async setStatus(id: string, status: string) {
    return this.prisma.driver.update({
      where: { userId: id },
      data: { status: status as any },
    });
  }

  async reject(id: string, reason: string) {
    await this.prisma.auditLog.create({
      data: { action: "DRIVER_REJECT", resourceType: "DRIVER", resourceId: id, metadata: { reason } },
    });
    return this.prisma.driver.update({
      where: { userId: id },
      data: { verificationStatus: "UNVERIFIED" },
    });
  }

  async stats() {
    const total = await this.prisma.driver.count();
    const verified = await this.prisma.driver.count({ where: { verificationStatus: "VERIFIED" } });
    const online = await this.prisma.driver.count({ where: { status: "ONLINE" } });
    const avgRating = await this.prisma.driver.aggregate({ _avg: { rating: true } });
    return { total, verified, online, pending: total - verified, avgRating: avgRating._avg.rating ?? 0 };
  }
}
