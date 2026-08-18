import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §15 — Payment State Machine
 * CREATED -> REQUIRES_ACTION -> AUTHORIZED -> CAPTURED -> SETTLED
 * CREATED -> FAILED
 * AUTHORIZED -> VOIDED
 * CAPTURED -> REFUND_PENDING -> REFUNDED/PARTIALLY_REFUNDED
 */
export const PAYMENT_TRANSITIONS: Record<string, string[]> = {
  CREATED: ["REQUIRES_ACTION", "AUTHORIZED", "FAILED"],
  REQUIRES_ACTION: ["AUTHORIZED", "FAILED"],
  AUTHORIZED: ["CAPTURED", "VOIDED"],
  CAPTURED: ["SETTLED", "REFUND_PENDING"],
  SETTLED: [],
  FAILED: [],
  VOIDED: [],
  REFUND_PENDING: ["REFUNDED", "PARTIALLY_REFUNDED"],
  REFUNDED: [],
  PARTIALLY_REFUNDED: ["REFUND_PENDING"],
};

// Ledger account mapping per status
// §16: every payment links to ledger entries (debit/credit pairs)
const LEDGER_TRIGGERS: Record<string, { debit: string; credit: string }> = {
  AUTHORIZED: { debit: "accounts:customer:pending", credit: "accounts:kemraa:pending" },
  CAPTURED: { debit: "accounts:kemraa:pending", credit: "accounts:kemraa:revenue" },
  VOIDED: { debit: "accounts:kemraa:pending", credit: "accounts:customer:pending" },
  REFUNDED: { debit: "accounts:kemraa:revenue", credit: "accounts:customer:refunded" },
  PARTIALLY_REFUNDED: { debit: "accounts:kemraa:revenue", credit: "accounts:customer:refunded" },
};

export type PaymentTransitionContext = {
  actorId?: string;
  actorType: "SYSTEM" | "CUSTOMER" | "STAFF" | "PROVIDER_WEBHOOK";
  actorRole?: string;
  reason?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  refundAmountMinor?: number; // for PARTIALLY_REFUNDED
};

@Injectable()
export class PaymentStateService {
  private readonly logger = new Logger(PaymentStateService.name);

  constructor(private readonly prisma: PrismaService) {}

  getAllowedTransitions(currentStatus: string): string[] {
    return PAYMENT_TRANSITIONS[currentStatus] ?? [];
  }

  async transition(
    paymentId: string,
    toStatus: string,
    ctx: PaymentTransitionContext,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundException("Payment not found");

      if (payment.status === toStatus) {
        // Idempotent
        return payment;
      }

      const allowed = this.getAllowedTransitions(payment.status);
      if (!allowed.includes(toStatus)) {
        throw new BadRequestException(
          `Invalid transition: ${payment.status} -> ${toStatus}. Allowed: ${allowed.join(", ") || "none (terminal)"}`,
        );
      }

      // Special validation for PARTIALLY_REFUNDED
      if (toStatus === "PARTIALLY_REFUNDED" && (!ctx.refundAmountMinor || ctx.refundAmountMinor <= 0)) {
        throw new BadRequestException("refundAmountMinor must be > 0 for PARTIALLY_REFUNDED");
      }
      if (toStatus === "PARTIALLY_REFUNDED" && ctx.refundAmountMinor! >= payment.amountMinor) {
        throw new BadRequestException("refundAmountMinor must be < payment amount for PARTIALLY_REFUNDED");
      }

      // Update payment status
      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: { status: toStatus as any },
      });

      // Record state history
      await tx.paymentStateHistory.create({
        data: {
          paymentId,
          fromStatus: payment.status,
          toStatus,
          actorId: ctx.actorId ?? null,
          actorType: ctx.actorType,
          reason: ctx.reason ?? null,
          metadata: {
            ...(ctx.metadata ?? {}),
            ...(ctx.refundAmountMinor ? { refundAmountMinor: ctx.refundAmountMinor } : {}),
          },
          ip: ctx.ip?.slice(0, 45) ?? null,
          userAgent: ctx.userAgent?.slice(0, 500) ?? null,
        },
      });

      // §16: Auto-create Ledger entries for financial states
      const ledgerConfig = LEDGER_TRIGGERS[toStatus];
      if (ledgerConfig) {
        const amount = ctx.refundAmountMinor ?? payment.amountMinor;
        await tx.ledgerEntry.createMany({
          data: [
            {
              accountId: ledgerConfig.debit,
              direction: "DEBIT" as any,
              amountMinor: amount,
              currency: payment.currency,
              referenceType: "PAYMENT",
              referenceId: payment.id,
              paymentId: payment.id,
            },
            {
              accountId: ledgerConfig.credit,
              direction: "CREDIT" as any,
              amountMinor: amount,
              currency: payment.currency,
              referenceType: "PAYMENT",
              referenceId: payment.id,
              paymentId: payment.id,
            },
          ],
        });
        this.logger.log(
          `Ledger entries created: ${ledgerConfig.debit} DEBIT / ${ledgerConfig.credit} CREDIT ${amount} ${payment.currency}`,
        );
      }

      this.logger.log(
        `Payment ${paymentId}: ${payment.status} -> ${toStatus} (actor=${ctx.actorType})`,
      );
      return updated;
    });
  }

  async getHistory(paymentId: string) {
    return this.prisma.paymentStateHistory.findMany({
      where: { paymentId },
      orderBy: { createdAt: "asc" },
    });
  }

  async getLedger(paymentId: string) {
    return this.prisma.ledgerEntry.findMany({
      where: { paymentId },
      orderBy: { createdAt: "asc" },
    });
  }

  async stats() {
    const grouped = await this.prisma.payment.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { amountMinor: true },
    });
    const byStatus: Record<string, { count: number; totalMinor: number }> = {};
    grouped.forEach((g) => {
      byStatus[g.status] = { count: g._count.id, totalMinor: g._sum.amountMinor ?? 0 };
    });
    const totalLedger = await this.prisma.ledgerEntry.count();
    return { byStatus, totalPayments: Object.values(byStatus).reduce((a, b) => a + b.count, 0), totalLedgerEntries: totalLedger };
  }

  async getDetailWithHistory(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: { select: { id: true, status: true, totalMinor: true, currency: true } },
        refunds: { orderBy: { createdAt: "desc" } },
        ledger: { orderBy: { createdAt: "asc" } },
        stateHistory: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    return {
      ...payment,
      allowedTransitions: this.getAllowedTransitions(payment.status),
    };
  }

  async listPayments(params: { status?: string; limit?: number } = {}) {
    const where: any = {};
    if (params.status) where.status = params.status;
    const items = await this.prisma.payment.findMany({
      where,
      include: {
        booking: { select: { id: true, status: true } },
        _count: { select: { ledger: true, refunds: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(params.limit ?? 50, 200),
    });
    return { items, total: await this.prisma.payment.count({ where }) };
  }
}
