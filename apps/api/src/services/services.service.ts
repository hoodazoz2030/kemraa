import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { CreateServiceDto, UpdateServiceDto, ListServicesQueryDto } from "./dto/services.dto.js";
import { Prisma } from "@prisma/client";

const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["PAUSED", "ARCHIVED"],
  PAUSED: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: [],
};

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateServiceDto) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, status: "ACTIVE" },
      select: { organizationId: true },
    });
    if (!membership) throw new BadRequestException({ code: "NO_PROVIDER" });
    return this.prisma.service.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type as any,
        currency: dto.currency ?? "EGP",
        priceMinor: dto.priceMinor ?? 0,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        status: "DRAFT",
        provider: { connect: { organizationId: membership.organizationId } },
      },
    });
  }

  async list(query: ListServicesQueryDto) {
    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.providerId) where.providerId = query.providerId;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.priceMinor = {};
      if (query.minPrice !== undefined) where.priceMinor.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.priceMinor.lte = query.maxPrice;
    }
    const [items, total] = await Promise.all([
      this.prisma.service.findMany({
        where, orderBy: { createdAt: "desc" },
        take: Math.min(query.limit ?? 50, 200), skip: query.offset ?? 0,
      }),
      this.prisma.service.count({ where }),
    ]);
    return { items, total, limit: query.limit ?? 50, offset: query.offset ?? 0 };
  }

  async getOne(serviceId: string) {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException({ code: "SERVICE_NOT_FOUND" });
    return service;
  }

  async update(userId: string, serviceId: string, dto: UpdateServiceDto) {
    await this.mustManage(userId, serviceId);
    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.priceMinor !== undefined) data.priceMinor = dto.priceMinor;
    if (dto.metadata !== undefined) data.metadata = dto.metadata as Prisma.InputJsonValue;
    return this.prisma.service.update({ where: { id: serviceId }, data });
  }

  async setStatus(userId: string, serviceId: string, status: string) {
    const service = await this.mustManage(userId, serviceId);
    if (!STATUS_TRANSITIONS[service.status]?.includes(status)) {
      throw new BadRequestException({ code: "INVALID_TRANSITION" });
    }
    return this.prisma.service.update({ where: { id: serviceId }, data: { status: status as any } });
  }

  async remove(userId: string, serviceId: string) {
    await this.mustManage(userId, serviceId);
    return this.prisma.service.update({ where: { id: serviceId }, data: { status: "ARCHIVED" } });
  }

  private async mustManage(userId: string, serviceId: string) {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException({ code: "SERVICE_NOT_FOUND" });
    const isSuperAdmin = await this.prisma.organizationMember.findFirst({
      where: { userId, role: { in: ["ADMIN", "SUPER_ADMIN", "OPERATIONS"] }, status: "ACTIVE" },
    });
    if (isSuperAdmin) return service;
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, organizationId: service.providerId, status: "ACTIVE",
        role: { in: ["PARTNER_ADMIN", "PARTNER_STAFF", "AGENCY_ADMIN", "CONTENT"] } },
    });
    if (!membership) throw new ForbiddenException({ code: "FORBIDDEN" });
    return service;
  }
}