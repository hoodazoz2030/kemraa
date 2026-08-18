import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §14 — Booking State Machine
 * DRAFT -> PENDING_APPROVAL -> PAYMENT_PENDING -> CONFIRMING -> CONFIRMED
 * PENDING_APPROVAL -> REJECTED
 * CONFIRMING -> FAILED
 * CONFIRMED -> CANCEL_REQUESTED -> CANCELLED
 * CONFIRMED -> COMPLETED
 * CONFIRMED -> DISPUTED
 *
 * No direct jumps (e.g. DRAFT -> CONFIRMED is forbidden).
 */
export const BOOKING_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PENDING_APPROVAL"],
  PENDING_APPROVAL: ["PAYMENT_PENDING", "REJECTED"],
  PAYMENT_PENDING: ["CONFIRMING"],
  CONFIRMING: ["CONFIRMED", "FAILED"],
  CONFIRMED: ["CANCEL_REQUESTED", "COMPLETED", "DISPUTED"],
  CANCEL_REQUESTED: ["CANCELLED"],
  REJECTED: [],
  FAILED: [],
  CANCELLED: [],
  COMPLETED: [],
  DISPUTED: [],
};

// Role-based permissions for each transition
export const TRANSITION_ROLES: Record<string, string[]> = {
  // System-driven
  "DRAFT->PENDING_APPROVAL": ["SYSTEM", "CUSTOMER", "THOTH", "SUPER_ADMIN", "ADMIN", "OPERATIONS"],
  "PENDING_APPROVAL->PAYMENT_PENDING": ["SYSTEM", "THOTH", "SUPER_ADMIN", "ADMIN"],
  "PAYMENT_PENDING->CONFIRMING": ["SYSTEM", "THOTH", "SUPER_ADMIN", "ADMIN"],
  "CONFIRMING->CONFIRMED": ["SYSTEM", "THOTH", "SUPER_ADMIN", "ADMIN"],
  // Admin-only rejections / failures
  "PENDING_APPROVAL->REJECTED": ["SUPER_ADMIN", "ADMIN", "OPERATIONS"],
  "CONFIRMING->FAILED": ["SYSTEM", "SUPER_ADMIN", "ADMIN"],
  // Customer-driven
  "CONFIRMED->CANCEL_REQUESTED": ["CUSTOMER", "SUPER_ADMIN", "ADMIN", "OPERATIONS", "SUPPORT"],
  "CONFIRMED->DISPUTED": ["CUSTOMER", "SUPER_ADMIN", "ADMIN", "SUPPORT"],
  // Terminal
  "CANCEL_REQUESTED->CANCELLED": ["SYSTEM", "SUPER_ADMIN", "ADMIN", "OPERATIONS"],
  "CONFIRMED->COMPLETED": ["SYSTEM", "SUPER_ADMIN", "ADMIN", "OPERATIONS"],
};

export type TransitionContext = {
  actorId?: string;
  actorType: "SYSTEM" | "CUSTOMER" | "THOTH" | "STAFF";
  actorRole?: string;
  reason?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
};

@Injectable()
export class BookingStateService {
  private readonly logger = new Logger(BookingStateService.name);

  constructor(private readonly prisma: PrismaService) {}

  getAllowedTransitions(currentStatus: string): string[] {
    return BOOKING_TRANSITIONS[currentStatus] ?? [];
  }

  /**
   * Validates + executes a state transition. Idempotent if toStatus === currentStatus.
   */
  async transition(
    bookingId: string,
    toStatus: string,
    ctx: TransitionContext,
  ) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException("Booking not found");

    if (booking.status === toStatus) {
      // Idempotent: no-op, return current state
      return booking;
    }

    const allowed = this.getAllowedTransitions(booking.status);
    if (!allowed.includes(toStatus)) {
      throw new BadRequestException(
        `Invalid transition: ${booking.status} -> ${toStatus}. Allowed: ${allowed.join(", ") || "none (terminal)"}`,
      );
    }

    // Role guard
    const transKey = `${booking.status}->${toStatus}`;
    const allowedRoles = TRANSITION_ROLES[transKey] ?? [];
    const actorIdentifier = ctx.actorRole ?? ctx.actorType;
    if (allowedRoles.length > 0 && !allowedRoles.includes(actorIdentifier)) {
      throw new BadRequestException(
        `Actor ${actorIdentifier} not allowed for ${transKey}. Required: ${allowedRoles.join(", ")}`,
      );
    }

    // Terminal states cannot transition further (double-check)
    if (allowed.length === 0) {
      throw new BadRequestException(`Booking is in terminal state ${booking.status}`);
    }

    // Atomic update + state history insert
    const [updated, _history] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: toStatus as any },
      }),
      this.prisma.bookingStateHistory.create({
        data: {
          bookingId,
          fromStatus: booking.status,
          toStatus,
          actorId: ctx.actorId ?? null,
          actorType: ctx.actorType,
          reason: ctx.reason ?? null,
          metadata: ctx.metadata ?? {},
          ip: ctx.ip?.slice(0, 45) ?? null,
          userAgent: ctx.userAgent?.slice(0, 500) ?? null,
        },
      }),
    ]);

    this.logger.log(
      `Booking ${bookingId}: ${booking.status} -> ${toStatus} (actor=${actorIdentifier})`,
    );
    return updated;
  }

  async getHistory(bookingId: string) {
    return this.prisma.bookingStateHistory.findMany({
      where: { bookingId },
      orderBy: { createdAt: "asc" },
    });
  }

  async stats() {
    const grouped = await this.prisma.booking.groupBy({
      by: ["status"],
      _count: { id: true },
    });
    const counts: Record<string, number> = {};
    grouped.forEach((g) => { counts[g.status] = g._count.id; });
    return { byStatus: counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
  }

  async getDetailWithHistory(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: { select: { id: true, title: true, type: true } },
        traveler: { select: { id: true, email: true, profile: true } },
        stateHistory: { orderBy: { createdAt: "asc" } },
        _count: { select: { payments: true, commissions: true } },
      },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    return {
      ...booking,
      allowedTransitions: this.getAllowedTransitions(booking.status),
    };
  }
}
