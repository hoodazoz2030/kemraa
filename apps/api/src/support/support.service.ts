import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { CreateTicketDto, UpdateTicketDto, ListTicketsQueryDto, CreateIncidentDto, ResolveIncidentDto, ListIncidentsQueryDto } from "./dto/support.dto.js";

const TICKET_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["WAITING", "RESOLVED", "CLOSED"],
  WAITING: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["CLOSED", "OPEN"],
  CLOSED: ["OPEN"],
};

const SLA_RESPONSE_MINUTES: Record<string, number> = {
  URGENT: 30, HIGH: 120, MEDIUM: 480, LOW: 1440,
};

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(userId: string, dto: CreateTicketDto) {
    return this.prisma.supportTicket.create({
      data: {
        category: dto.category,
        priority: (dto.priority ?? "MEDIUM") as any,
        status: "OPEN",
        userId,
        tripId: dto.tripId ?? null,
      },
      include: {
        user: { select: { email: true } },
        trip: { select: { title: true, status: true } },
      },
    });
  }

  async listTickets(userId: string, isAdmin: boolean, query: ListTicketsQueryDto) {
    const where: any = {};
    if (!isAdmin) where.userId = userId;
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.category) where.category = { contains: query.category, mode: "insensitive" };
    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where, orderBy: { createdAt: "desc" },
        take: Math.min(query.limit ?? 50, 200), skip: query.offset ?? 0,
        include: {
          user: { select: { email: true } },
          trip: { select: { title: true, status: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { items, total, limit: query.limit ?? 50, offset: query.offset ?? 0 };
  }

  async getTicket(userId: string, isAdmin: boolean, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { email: true } },
        trip: { select: { title: true, status: true } },
      },
    });
    if (!ticket) throw new NotFoundException({ code: "TICKET_NOT_FOUND" });
    if (!isAdmin && ticket.userId !== userId) throw new ForbiddenException({ code: "FORBIDDEN" });
    return ticket;
  }

  async updateTicket(userId: string, ticketId: string, dto: UpdateTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException({ code: "TICKET_NOT_FOUND" });
    if (dto.status) this.assertTransition(ticket.status, dto.status);
    const data: any = {};
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.assignedTo !== undefined) data.assignedTo = dto.assignedTo;
    return this.prisma.supportTicket.update({
      where: { id: ticketId }, data,
      include: { user: { select: { email: true } }, trip: { select: { title: true } } },
    });
  }

  async checkSla(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException({ code: "TICKET_NOT_FOUND" });
    const slaMinutes = SLA_RESPONSE_MINUTES[ticket.priority] ?? 480;
    const now = new Date();
    const elapsedMinutes = Math.round((now.getTime() - ticket.createdAt.getTime()) / 60000);
    const resolved = ticket.status === "RESOLVED" || ticket.status === "CLOSED";
    return {
      ticketId,
      priority: ticket.priority,
      status: ticket.status,
      slaResponseMinutes: slaMinutes,
      elapsedMinutes,
      breached: !resolved && elapsedMinutes > slaMinutes,
      resolved,
    };
  }

  // === INCIDENTS ===
  async createIncident(userId: string, dto: CreateIncidentDto) {
    return this.prisma.incident.create({
      data: {
        type: dto.type,
        severity: (dto.severity ?? "MEDIUM") as any,
        status: "OPEN",
        tripId: dto.tripId ?? null,
        resolution: dto.resolution ?? null,
      },
      include: { trip: { select: { title: true } } },
    });
  }

  async listIncidents(query: ListIncidentsQueryDto) {
    const where: any = {};
    if (query.severity) where.severity = query.severity;
    if (query.status) where.status = query.status;
    if (query.type) where.type = { contains: query.type, mode: "insensitive" };
    const [items, total] = await Promise.all([
      this.prisma.incident.findMany({
        where, orderBy: { createdAt: "desc" },
        take: Math.min(query.limit ?? 50, 200), skip: query.offset ?? 0,
        include: { trip: { select: { title: true } } },
      }),
      this.prisma.incident.count({ where }),
    ]);
    return { items, total, limit: query.limit ?? 50, offset: query.offset ?? 0 };
  }

  async getIncident(incidentId: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: { trip: { select: { title: true } } },
    });
    if (!incident) throw new NotFoundException({ code: "INCIDENT_NOT_FOUND" });
    return incident;
  }

  async resolveIncident(userId: string, incidentId: string, dto: ResolveIncidentDto) {
    const incident = await this.prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) throw new NotFoundException({ code: "INCIDENT_NOT_FOUND" });
    if (incident.status === "RESOLVED") {
      throw new BadRequestException({ code: "INCIDENT_ALREADY_RESOLVED" });
    }
    return this.prisma.incident.update({
      where: { id: incidentId },
      data: { status: "RESOLVED", resolution: dto.resolution },
    });
  }

  private assertTransition(from: string, to: string) {
    if (!TICKET_TRANSITIONS[from]?.includes(to)) {
      throw new BadRequestException({ code: "INVALID_TRANSITION", message: `Cannot go ${from} -> ${to}` });
    }
  }
}