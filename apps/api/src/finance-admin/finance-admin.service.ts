import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class FinanceAdminService {
  private readonly logger = new Logger(FinanceAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============ Commission Rules ============
  async listRules(params: { scopeType?: string; active?: string } = {}) {
    const where: any = {};
    if (params.scopeType) where.scopeType = params.scopeType;
    const now = new Date();
    if (params.active === "true") {
      where.activeFrom = { lte: now };
      where.OR = [{ activeTo: null }, { activeTo: { gte: now } }];
    } else if (params.active === "false") {
      where.activeTo = { lt: now };
    }
    const items = await this.prisma.commissionRule.findMany({
      where,
      orderBy: { activeFrom: "desc" },
      include: { _count: { select: { entries: true } } },
    });
    return { items, total: await this.prisma.commissionRule.count({ where }) };
  }

  async createRule(data: {
    scopeType: string;
    scopeId?: string;
    basis?: string;
    rateBps?: number;
    fixedMinor?: number;
    currency?: string;
    activeFrom?: string;
    activeTo?: string;
  }) {
    const validScopes = ["PARTNER", "SERVICE", "AGENCY", "GLOBAL"];
    if (!validScopes.includes(data.scopeType)) {
      throw new BadRequestException(`scopeType must be one of: ${validScopes.join(", ")}`);
    }
    return this.prisma.commissionRule.create({
      data: {
        scopeType: data.scopeType,
        scopeId: data.scopeId ?? null,
        basis: data.basis ?? "NET",
        rateBps: data.rateBps ?? 0,
        fixedMinor: data.fixedMinor ?? 0,
        currency: data.currency ?? "EGP",
        activeFrom: data.activeFrom ? new Date(data.activeFrom) : new Date(),
        activeTo: data.activeTo ? new Date(data.activeTo) : null,
      },
    });
  }

  async updateRule(id: string, data: any) {
    const rule = await this.prisma.commissionRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException("Commission rule not found");
    const upd: any = { ...data };
    if (data.activeFrom) upd.activeFrom = new Date(data.activeFrom);
    if (data.activeTo !== undefined) upd.activeTo = data.activeTo ? new Date(data.activeTo) : null;
    return this.prisma.commissionRule.update({ where: { id }, data: upd });
  }

  async deleteRule(id: string) {
    const hasEntries = await this.prisma.commissionEntry.count({ where: { ruleId: id } });
    if (hasEntries > 0) throw new BadRequestException("Cannot delete rule with existing entries. Deactivate instead.");
    await this.prisma.commissionRule.delete({ where: { id } });
    return { ok: true };
  }

  // ============ Agencies ============
  async listAgencies() {
    return this.prisma.agency.findMany({
      include: {
        organization: true,
        _count: { select: { attributions: true } },
      },
    });
  }

  async updateAgency(organizationId: string, data: { attributionWindowDays?: number; commissionPolicyId?: string | null }) {
    const agency = await this.prisma.agency.findUnique({ where: { organizationId } });
    if (!agency) throw new NotFoundException("Agency not found");
    if (data.attributionWindowDays !== undefined && (data.attributionWindowDays < 1 || data.attributionWindowDays > 365)) {
      throw new BadRequestException("attributionWindowDays must be between 1 and 365");
    }
    return this.prisma.agency.update({ where: { organizationId }, data });
  }

  async agencyStats(organizationId: string) {
    const [attributions, attributedCustomers] = await Promise.all([
      this.prisma.attribution.count({ where: { agencyId: organizationId } }),
      this.prisma.attribution.count({ where: { agencyId: organizationId, customerId: { not: null } } }),
    ]);
    const commissionSum = await this.prisma.commissionEntry.aggregate({
      where: { beneficiaryType: "AGENCY", beneficiaryId: organizationId, status: "SETTLED" as any },
      _sum: { amountMinor: true },
    });
    return { attributions, attributedCustomers, earnedCommissionMinor: commissionSum._sum.amountMinor ?? 0 };
  }
}
