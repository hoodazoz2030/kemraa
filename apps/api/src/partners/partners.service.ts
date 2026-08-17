import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { type?: string; status?: string; search?: string; limit?: number } = {}) {
    const where: any = { partner: { isNot: null } };
    if (params.type) where.type = params.type;
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { legalName: { contains: params.search, mode: "insensitive" } },
        { displayName: { contains: params.search, mode: "insensitive" } },
      ];
    }
    const items = await this.prisma.organization.findMany({
      where,
      include: {
        partner: {
          include: {
            _count: { select: { services: true, drivers: true, vehicles: true, settlements: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(params.limit ?? 50, 200),
    });
    return { items, total: await this.prisma.organization.count({ where }) };
  }

  async detail(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        partner: {
          include: {
            services: { take: 10 },
            drivers: { take: 10, include: { user: { select: { email: true, profile: true } } } },
            vehicles: { take: 10 },
            settlements: { take: 10 },
          },
        },
        members: { take: 10 },
      },
    });
    if (!org) throw new NotFoundException("Partner not found");
    return org;
  }

  async create(data: {
    legalName: string;
    displayName: string;
    type: string;
    country?: string;
    partnerType?: string;
    settlementTerms?: Record<string, any>;
    metadata?: Record<string, any>;
  }) {
    if (!data.legalName?.trim()) throw new BadRequestException("legalName required");
    if (!data.displayName?.trim()) throw new BadRequestException("displayName required");

    const org = await this.prisma.organization.create({
      data: {
        legalName: data.legalName,
        displayName: data.displayName,
        type: data.type,
        country: data.country ?? "EG",
        metadata: data.metadata ?? {},
        partner: {
          create: {
            partnerType: data.partnerType ?? data.type,
            contractStatus: "DRAFT",
            settlementTerms: data.settlementTerms ?? {},
          },
        },
      },
      include: { partner: true },
    });
    return org;
  }

  async update(id: string, data: any) {
    const orgUpdate: any = {};
    const partnerUpdate: any = {};

    if (data.legalName !== undefined) orgUpdate.legalName = data.legalName;
    if (data.displayName !== undefined) orgUpdate.displayName = data.displayName;
    if (data.type !== undefined) orgUpdate.type = data.type;
    if (data.country !== undefined) orgUpdate.country = data.country;
    if (data.metadata !== undefined) orgUpdate.metadata = data.metadata;
    if (data.partnerType !== undefined) partnerUpdate.partnerType = data.partnerType;
    if (data.settlementTerms !== undefined) partnerUpdate.settlementTerms = data.settlementTerms;

    await this.prisma.organization.update({ where: { id }, data: orgUpdate });
    if (Object.keys(partnerUpdate).length > 0) {
      await this.prisma.partner.update({ where: { organizationId: id }, data: partnerUpdate });
    }
    return this.detail(id);
  }

  async setStatus(id: string, status: string) {
    await this.prisma.organization.update({ where: { id }, data: { status: status as any } });
    await this.prisma.partner.update({ where: { organizationId: id }, data: { contractStatus: status as any } });
    return this.detail(id);
  }

  async stats() {
    const total = await this.prisma.partner.count();
    const active = await this.prisma.partner.count({ where: { contractStatus: "ACTIVE" } });
    const draft = await this.prisma.partner.count({ where: { contractStatus: "DRAFT" } });
    const byType = await this.prisma.organization.groupBy({
      by: ["type"],
      _count: true,
      where: { partner: { isNot: null } },
    });
    return { total, active, draft, pending: total - active - draft, byType };
  }

  async addVehicle(partnerId: string, data: { plateRef: string; make: string; model: string; year: number; capacity: number }) {
    return this.prisma.vehicle.create({
      data: {
        partnerId,
        plateRef: data.plateRef,
        make: data.make,
        model: data.model,
        year: data.year,
        capacity: data.capacity,
      },
    });
  }

  // ============ Drivers assignment ============
  async assignDriver(partnerId: string, driverUserId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: driverUserId } });
    if (!driver) throw new NotFoundException("Driver not found");
    return this.prisma.driver.update({
      where: { userId: driverUserId },
      data: { partnerId },
      include: { user: { select: { email: true, profile: true } } },
    });
  }

  async unassignDriver(driverUserId: string) {
    return this.prisma.driver.update({
      where: { userId: driverUserId },
      data: { partnerId: null },
    });
  }

  // ============ Services assignment (Service uses providerId) ============
  async assignService(partnerId: string, serviceId: string) {
    const svc = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!svc) throw new NotFoundException("Service not found");
    return this.prisma.service.update({
      where: { id: serviceId },
      data: { providerId: partnerId },
    });
  }

  // ============ Settlements ============
  async listSettlements(params: { partnerId?: string; status?: string; limit?: number } = {}) {
    const where: any = {};
    if (params.partnerId) where.partnerId = params.partnerId;
    if (params.status) where.status = params.status as any;
    const items = await this.prisma.settlement.findMany({
      where,
      include: {
        partner: { include: { organization: true } },
      },
      take: Math.min(params.limit ?? 50, 200),
    });
    return { items, total: await this.prisma.settlement.count({ where }) };
  }

  async createSettlement(data: {
    partnerId: string;
    periodStart: string;
    periodEnd: string;
    netMinor: number;
    grossMinor?: number;
    commissionMinor?: number;
    currency?: string;
  }) {
    return this.prisma.settlement.create({
      data: {
        partnerId: data.partnerId,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        grossMinor: data.grossMinor ?? data.netMinor,
        commissionMinor: data.commissionMinor ?? 0,
        netMinor: data.netMinor,
        currency: data.currency ?? "EGP",
        status: "OPEN",
      },
      include: { partner: { include: { organization: true } } },
    });
  }

  async approveSettlement(id: string) {
    return this.prisma.settlement.update({
      where: { id },
      data: { status: "APPROVED" },
      include: { partner: { include: { organization: true } } },
    });
  }

  async paySettlement(id: string) {
    return this.prisma.settlement.update({
      where: { id },
      data: { status: "PAID" },
      include: { partner: { include: { organization: true } } },
    });
  }

  async settlementsStats() {
    const total = await this.prisma.settlement.count();
    const open = await this.prisma.settlement.count({ where: { status: "OPEN" as any } });
    const approved = await this.prisma.settlement.count({ where: { status: "APPROVED" as any } });
    const paid = await this.prisma.settlement.count({ where: { status: "PAID" as any } });
    const pendingSum = await this.prisma.settlement.aggregate({
      where: { status: { in: ["OPEN", "APPROVED"] as any } },
      _sum: { netMinor: true },
    });
    const paidSum = await this.prisma.settlement.aggregate({
      where: { status: "PAID" as any },
      _sum: { netMinor: true },
    });
    return {
      total,
      open,
      approved,
      paid,
      pendingAmountMinor: pendingSum._sum?.netMinor ?? 0,
      paidAmountMinor: paidSum._sum?.netMinor ?? 0,
    };
  }
}
