import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class PromosService {
  constructor(private readonly prisma: PrismaService) {}

  list() { return this.prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } }); }

  async create(data: { code: string; kind?: string; valueBps?: number; amountMinor?: number; currency?: string; maxUses?: number; activeTo?: string }) {
    const code = data.code.trim().toUpperCase();
    if (code.length < 3) throw new BadRequestException("Code too short");
    return this.prisma.promoCode.create({
      data: {
        code,
        kind: data.kind ?? "PERCENT",
        valueBps: data.valueBps ?? 0,
        amountMinor: data.amountMinor ?? 0,
        currency: data.currency ?? "EGP",
        maxUses: data.maxUses ?? 0,
        activeTo: data.activeTo ? new Date(data.activeTo) : null,
      },
    });
  }

  async update(id: string, data: any) {
    const upd: any = {};
    if (data.kind !== undefined) upd.kind = data.kind;
    if (data.valueBps !== undefined) upd.valueBps = data.valueBps;
    if (data.amountMinor !== undefined) upd.amountMinor = data.amountMinor;
    if (data.maxUses !== undefined) upd.maxUses = data.maxUses;
    if (data.active !== undefined) upd.active = data.active;
    if (data.activeTo !== undefined) upd.activeTo = data.activeTo ? new Date(data.activeTo) : null;
    return this.prisma.promoCode.update({ where: { id }, data: upd });
  }

  async remove(id: string) {
    return this.prisma.promoCode.update({ where: { id }, data: { active: false } });
  }

  async validate(code: string, amountMinor: number) {
    const p = await this.prisma.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (!p || !p.active) throw new NotFoundException("Invalid code");
    const now = new Date();
    if (now < p.activeFrom || (p.activeTo && now > p.activeTo)) throw new NotFoundException("Code expired");
    if (p.maxUses > 0 && p.usedCount >= p.maxUses) throw new NotFoundException("Code fully used");
    const discountMinor = p.kind === "PERCENT"
      ? Math.round((amountMinor * p.valueBps) / 10000)
      : Math.min(amountMinor, p.amountMinor);
    return { code: p.code, kind: p.kind, discountMinor, currency: p.currency };
  }
}
