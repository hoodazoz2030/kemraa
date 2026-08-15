import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  // Customer: own tickets
  async myTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { replies: true } } },
    });
  }

  // Admin: all tickets
  async adminList(filter?: { status?: string; priority?: string; assignedTo?: string }) {
    const where: any = {};
    if (filter?.status) where.status = filter.status as any;
    if (filter?.priority) where.priority = filter.priority;
    if (filter?.assignedTo) where.assignedTo = filter.assignedTo;

    const tickets = await this.prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
        _count: { select: { replies: true } },
      },
      take: 200,
    });

    return tickets.map((t) => ({
      ...t,
      customerName:
        [t.user.profile?.firstName, t.user.profile?.lastName].filter(Boolean).join(" ") || t.user.email || "Unknown",
    }));
  }

  // Ticket details with replies
  async getDetail(ticketId: string, userId?: string, isAdmin = false) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
        replies: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");
    if (!isAdmin && ticket.userId !== userId) throw new ForbiddenException("Not your ticket");
    return ticket;
  }

  // Add reply
  async addReply(ticketId: string, authorId: string, body: string, isStaff: boolean) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException("Ticket not found");
    if (!isStaff && ticket.userId !== authorId) throw new ForbiddenException("Not your ticket");

    const reply = await this.prisma.supportReply.create({
      data: { ticketId, authorId, body, isStaff },
    });

    // Auto-move ticket to IN_PROGRESS when staff replies (if OPEN)
    if (isStaff && ticket.status === "OPEN") {
      await this.prisma.supportTicket.update({ where: { id: ticketId }, data: { status: "IN_PROGRESS" } });
    }

    return reply;
  }

  // Admin: update status / priority / assignment
  async adminUpdate(ticketId: string, update: { status?: string; priority?: string; assignedTo?: string | null }) {
    return this.prisma.supportTicket.update({ where: { id: ticketId }, data: update as any });
  }

  // Admin: seed sample tickets
  async seedSample(userId: string) {
    const samples = [
      { category: "PAYMENT", priority: "HIGH", body: "I was charged twice for booking #9217. Please refund." },
      { category: "BOOKING", priority: "MEDIUM", body: "Need to change travel dates for upcoming trip." },
      { category: "ACCOUNT", priority: "LOW", body: "How do I enable two-factor authentication?" },
      { category: "TECHNICAL", priority: "URGENT", body: "Cannot access my account after password reset." },
    ];
    for (const s of samples) {
      await this.prisma.supportTicket.create({
        data: { userId, category: s.category, priority: s.priority as any, subject: s.body.slice(0, 60), body: s.body },
      });
    }
    return { seeded: samples.length };
  }
}