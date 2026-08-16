import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class RefundsService {
  constructor(private readonly prisma: PrismaService) {}

  async adminList() {
    return this.prisma.refund.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        payment: {
          include: {
            booking: {
              include: {
                service: { select: { title: true, type: true } },
                traveler: { select: { email: true } },
              },
            },
          },
        },
      },
    });
  }

  async create(paymentId: string, amountMinor: number, reason?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException("Payment not found");
    if (!["CAPTURED", "SETTLED", "PARTIALLY_REFUNDED"].includes(payment.status)) {
      throw new BadRequestException("Payment not refundable");
    }
    const existing = await this.prisma.refund.findMany({
      where: { paymentId, status: { in: ["PENDING", "PROCESSING", "SUCCEEDED"] } },
    });
    const used = existing.reduce((s, r) => s + r.amountMinor, 0);
    if (amountMinor + used > payment.amountMinor) {
      throw new BadRequestException("Refund exceeds remaining amount");
    }
    return this.prisma.refund.create({
      data: {
        paymentId,
        amountMinor,
        reason,
        idempotencyKey: "ref-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      },
    });
  }

  async transition(id: string, to: "PROCESSING" | "SUCCEEDED" | "FAILED") {
    const refund = await this.prisma.refund.findUnique({ where: { id }, include: { payment: true } });
    if (!refund) throw new NotFoundException("Refund not found");
    const allowed: Record<string, string[]> = {
      PROCESSING: ["PENDING"],
      SUCCEEDED: ["PENDING", "PROCESSING"],
      FAILED: ["PENDING", "PROCESSING"],
    };
    if (!allowed[to].includes(refund.status)) {
      throw new BadRequestException("Cannot go " + refund.status + " -> " + to);
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.refund.update({ where: { id }, data: { status: to } });
      if (to === "SUCCEEDED") {
        const succeeded = await tx.refund.findMany({ where: { paymentId: refund.paymentId, status: "SUCCEEDED" } });
        const total = succeeded.reduce((s, r) => s + r.amountMinor, 0);
        await tx.payment.update({
          where: { id: refund.paymentId },
          data: { status: total >= refund.payment.amountMinor ? "REFUNDED" : "PARTIALLY_REFUNDED" },
        });
      }
      return updated;
    });
  }
}
