import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(params: { status?: string; severity?: string; type?: string } = {}) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.severity) where.severity = params.severity as any;
    if (params.type) where.type = params.type;
    const items = await this.prisma.incident.findMany({
      where,
      include: { trip: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return { items, total: await this.prisma.incident.count({ where }) };
  }

  async create(data: { tripId?: string; type: string; severity?: string; status?: string }) {
    const validTypes = ["SAFETY", "FRAUD", "PAYMENT_DISPUTE", "SERVICE_FAILURE", "CANCELLATION", "COMPLAINT", "TECHNICAL", "OTHER"];
    if (!validTypes.includes(data.type)) {
      throw new BadRequestException(`type must be one of: ${validTypes.join(", ")}`);
    }
    if (data.tripId) {
      const trip = await this.prisma.trip.findUnique({ where: { id: data.tripId } });
      if (!trip) throw new NotFoundException("Trip not found");
    }
    return this.prisma.incident.create({
      data: {
        tripId: data.tripId ?? null,
        type: data.type,
        severity: (data.severity as any) ?? "MEDIUM",
        status: data.status ?? "OPEN",
      },
      include: { trip: { select: { id: true, title: true } } },
    });
  }

  async updateStatus(id: string, status: string, resolution?: string) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException("Incident not found");

    // State machine: OPEN → IN_PROGRESS → RESOLVED → CLOSED
    const transitions: Record<string, string[]> = {
      OPEN: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
      IN_PROGRESS: ["RESOLVED", "CLOSED"],
      RESOLVED: ["CLOSED", "IN_PROGRESS"],
      CLOSED: [],
    };
    const allowed = transitions[incident.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${incident.status} to ${status}. Allowed: ${allowed.join(", ") || "none"}`);
    }
    if (["RESOLVED", "CLOSED"].includes(status) && !resolution?.trim()) {
      throw new BadRequestException("Resolution is required for RESOLVED/CLOSED");
    }
    const updated = await this.prisma.incident.update({
      where: { id },
      data: { status, resolution: resolution?.trim() || incident.resolution },
      include: { trip: { select: { id: true, title: true } } },
    });
    this.logger.log(`Incident ${id}: ${incident.status} → ${status}`);
    return updated;
  }

  async stats() {
    const [open, inProgress, resolved, closed, bySeverity] = await Promise.all([
      this.prisma.incident.count({ where: { status: "OPEN" } }),
      this.prisma.incident.count({ where: { status: "IN_PROGRESS" } }),
      this.prisma.incident.count({ where: { status: "RESOLVED" } }),
      this.prisma.incident.count({ where: { status: "CLOSED" } }),
      this.prisma.incident.groupBy({ by: ["severity"], _count: { id: true } }),
    ]);
    const severityMap: Record<string, number> = {};
    bySeverity.forEach((s) => { severityMap[s.severity] = s._count.id; });
    return { open, inProgress, resolved, closed, bySeverity: severityMap, total: open + inProgress + resolved + closed };
  }
}
