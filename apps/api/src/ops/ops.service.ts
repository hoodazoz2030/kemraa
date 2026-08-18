import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import * as net from "node:net";

// THOTH tools allow-list per spec 13.1 + risk levels per 13.2
const THOTH_TOOLS: Array<[string, string, boolean, string]> = [
  ["search_services", "LOW", false, "Search catalog services"],
  ["get_service_details", "LOW", false, "Fetch service details"],
  ["get_availability", "MEDIUM", false, "Check provider availability"],
  ["create_itinerary_draft", "MEDIUM", false, "Draft itinerary"],
  ["update_itinerary", "MEDIUM", false, "Modify itinerary"],
  ["calculate_budget", "LOW", false, "Budget math"],
  ["create_booking_draft", "MEDIUM", false, "Booking draft (no commit)"],
  ["request_user_approval", "LOW", false, "Ask user approval gate"],
  ["create_payment_intent", "HIGH", true, "Create payment intent"],
  ["confirm_booking", "HIGH", true, "Commit booking"],
  ["cancel_booking", "HIGH", true, "Cancel booking"],
  ["request_refund", "HIGH", true, "Refund request"],
  ["estimate_ride", "LOW", false, "Fare estimate"],
  ["request_ride", "HIGH", true, "Request ride"],
  ["get_ride_status", "LOW", false, "Ride status"],
  ["send_notification", "MEDIUM", false, "Send notification"],
  ["create_support_ticket", "MEDIUM", false, "Open support ticket"],
  ["create_incident", "HIGH", true, "Report incident"],
  ["search_destination_knowledge", "LOW", false, "Destination knowledge"],
];

@Injectable()
export class OpsService implements OnModuleInit {
  private readonly logger = new Logger(OpsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Seed THOTH tools allow-list on boot (idempotent)
  async onModuleInit() {
    try {
      for (const [name, risk, needsApproval, description] of THOTH_TOOLS) {
        await this.prisma.thothTool.upsert({
          where: { name },
          update: {},
          create: { name, riskLevel: risk, requiresApproval: needsApproval, description },
        });
      }
      this.logger.log(`THOTH tools seeded: ${THOTH_TOOLS.length}`);
    } catch (e: any) {
      this.logger.warn(`THOTH seed skipped: ${e.message}`);
    }
  }

  // ============ Content ============
  async listContent(params: { type?: string; status?: string; locale?: string } = {}) {
    const where: any = {};
    if (params.type) where.type = params.type;
    if (params.status) where.status = params.status;
    if (params.locale) where.locale = params.locale;
    const items = await this.prisma.contentItem.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
    return { items, total: await this.prisma.contentItem.count({ where }) };
  }

  async createContent(data: { type: string; title: string; body: string; locale?: string; status?: string; metadata?: any }, actorId?: string) {
    return this.prisma.contentItem.create({
      data: {
        type: data.type,
        title: data.title,
        body: data.body,
        locale: data.locale ?? "ar-EG",
        status: data.status ?? "DRAFT",
        metadata: data.metadata ?? {},
        createdBy: actorId ?? null,
        publishedAt: data.status === "PUBLISHED" ? new Date() : null,
      },
    });
  }

  async updateContent(id: string, data: any) {
    const item = await this.prisma.contentItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException("Content not found");
    const upd: any = { ...data };
    if (data.status === "PUBLISHED" && item.status !== "PUBLISHED") upd.publishedAt = new Date();
    if (data.status && data.status !== "PUBLISHED") upd.publishedAt = null;
    return this.prisma.contentItem.update({ where: { id }, data: upd });
  }

  async deleteContent(id: string) {
    await this.prisma.contentItem.delete({ where: { id } });
    return { ok: true };
  }

  // ============ THOTH ============
  async listTools() {
    return this.prisma.thothTool.findMany({ orderBy: { riskLevel: "asc" } });
  }

  async updateTool(id: string, data: { enabled?: boolean; riskLevel?: string; requiresApproval?: boolean; description?: string }) {
    return this.prisma.thothTool.update({ where: { id }, data });
  }

  async createTool(data: { name: string; riskLevel: string; requiresApproval?: boolean; description?: string }) {
    return this.prisma.thothTool.create({ data: { name: data.name, riskLevel: data.riskLevel, requiresApproval: data.requiresApproval ?? false, description: data.description ?? null } });
  }

  async listActions(status?: string) {
    const where: any = status ? { status } : {};
    return this.prisma.thothAction.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
  }

  async simulateAction(data: { toolName: string; payload?: any }) {
    const tool = await this.prisma.thothTool.findUnique({ where: { name: data.toolName } });
    if (!tool) throw new NotFoundException("Tool not in allow-list");
    if (!tool.enabled) throw new BadRequestException("Tool disabled");
    return this.prisma.thothAction.create({
      data: { toolName: tool.name, riskLevel: tool.riskLevel, payload: data.payload ?? {}, status: "PENDING" },
    });
  }

  async decideAction(id: string, approve: boolean, decidedBy: string | undefined, note?: string) {
    const action = await this.prisma.thothAction.findUnique({ where: { id } });
    if (!action) throw new NotFoundException("Action not found");
    if (action.status !== "PENDING") throw new BadRequestException("Already decided");
    return this.prisma.thothAction.update({
      where: { id },
      data: { status: approve ? "APPROVED" : "REJECTED", decidedBy: decidedBy ?? null, decidedAt: new Date(), decisionNote: note ?? null },
    });
  }

  // ============ Queues / DLQ ============
  async queuesStatus() {
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    let redisStatus = "down";
    try {
      const u = new URL(redisUrl);
      redisStatus = await new Promise<string>((resolve) => {
        const socket = net.connect({ host: u.hostname, port: Number(u.port || 6379), timeout: 1500 });
        socket.on("connect", () => { socket.destroy(); resolve("up"); });
        socket.on("error", () => resolve("down"));
        socket.on("timeout", () => { socket.destroy(); resolve("down"); });
      });
    } catch { redisStatus = "down"; }

    // Registered queues (will be backed by BullMQ workers in a later phase)
    const queues = ["notifications", "events", "search-indexing", "settlements"].map((name) => ({
      name, waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, dlq: 0,
    }));

    return {
      redis: { status: redisStatus, url: redisUrl.replace(/:[^:@]+@/, ":***@") },
      queues,
      dlq: [],
      note: "BullMQ workers ship in the events phase; registry is live.",
    };
  }
}
