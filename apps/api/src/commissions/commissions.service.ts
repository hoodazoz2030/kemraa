import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listRules() {
    return this.prisma.commissionRule.findMany({ orderBy: { activeFrom: "desc" } });
  }

  async createRule(data: { scopeType: string; scopeId?: string; basis?: string; rateBps?: number; fixedMinor?: number; currency?: string }) {
    if (data.rateBps != null && (data.rateBps < 0 || data.rateBps > 10000)) {
      throw new BadRequestException("rateBps must be 0-10000");
    }
    return this.prisma.commissionRule.create({ data: data as any });
  }

  async updateRule(id: string, data: { rateBps?: number; fixedMinor?: number; activeTo?: string }) {
    const rule = await this.prisma.commissionRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException("Rule not found");
    return this.prisma.commissionRule.update({
      where: { id },
      data: {
        rateBps: data.rateBps ?? rule.rateBps,
        fixedMinor: data.fixedMinor ?? rule.fixedMinor,
        activeTo: data.activeTo ? new Date(data.activeTo) : rule.activeTo,
      },
    });
  }

  async listEntries() {
    return this.prisma.commissionEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        rule: true,
        booking: {
          include: {
            service: { select: { title: true } },
            traveler: { select: { email: true } },
          },
        },
      },
    });
  }

  async markEligible(id: string) {
    const e = await this.prisma.commissionEntry.findUnique({ where: { id } });
    if (!e) throw new NotFoundException("Entry not found");
    if (e.status !== "PENDING") throw new BadRequestException("Entry not PENDING");
    return this.prisma.commissionEntry.update({ where: { id }, data: { status: "ELIGIBLE" } });
  }

  async markPaid(id: string) {
    const e = await this.prisma.commissionEntry.findUnique({ where: { id } });
    if (!e) throw new NotFoundException("Entry not found");
    if (!["PENDING", "ELIGIBLE"].includes(e.status)) throw new BadRequestException("Cannot pay " + e.status);
    return this.prisma.commissionEntry.update({ where: { id }, data: { status: "PAID" } });
  }
}
