import { Controller, Get, Post, Body, Param, Req, UseGuards, ParseUUIDPipe, BadRequestException, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PartnerGuard } from "../common/guards/partner.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";
import * as crypto from "crypto";

const EVENT_TYPES = [
  "booking.created", "booking.updated", "booking.confirmed", "booking.cancelled",
  "payment.updated", "ride.status_changed", "settlement.paid", "document.updated",
];

@ApiTags("partner-webhooks")
@ApiBearerAuth()
@UseGuards(PartnerGuard)
@Controller("partner-webhooks")
export class PartnerWebhooksController {
  constructor(private readonly prisma: PrismaService) {}

  // ===== 1. List events (read-only) =====
  @Get()
  async list(@Req() req: any, @Param("eventType") eventType?: string) {
    const where: any = { partnerId: req.partnerUser.partnerId };
    if (eventType) where.eventType = eventType;
    const items = await this.prisma.webhookEvent.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: 100,
    });
    return { items };
  }

  @Get(":id")
  async detail(@Req() req: any, @Param("id", new ParseUUIDPipe()) id: string) {
    const ev = await this.prisma.webhookEvent.findFirst({ where: { id, partnerId: req.partnerUser.partnerId } });
    if (!ev) throw new BadRequestException({ code: "NOT_FOUND" });
    return ev;
  }

  // ===== 2. Emit event (idempotent - dedup by eventId) =====
  @Post("emit")
  @Audit("partner.webhook_emit", "webhook")
  @HttpCode(HttpStatus.OK)
  async emit(@Req() req: any, @Body() b: { eventType: string; eventId: string; payload?: any; version?: string }) {
    if (!EVENT_TYPES.includes(b.eventType)) throw new BadRequestException({ code: "INVALID_EVENT_TYPE" });
    if (!b.eventId) throw new BadRequestException({ code: "MISSING_EVENT_ID" });

    // Idempotency check
    const existing = await this.prisma.webhookEvent.findUnique({ where: { eventId: b.eventId } });
    if (existing) {
      return { idempotent: true, id: existing.id, alreadyProcessed: existing.processed };
    }

    // Generate HMAC signature
    const secret = process.env.WEBHOOK_SECRET || "kemraa-webhook-secret";
    const payloadStr = JSON.stringify(b.payload ?? {});
    const signature = crypto.createHmac("sha256", secret).update(b.eventId + "|" + payloadStr).digest("hex");

    const ev = await this.prisma.webhookEvent.create({
      data: {
        partnerId: req.partnerUser.partnerId,
        eventType: b.eventType,
        eventId: b.eventId,
        version: b.version ?? "1.0",
        payload: b.payload ?? {},
        signature,
        processed: false,
      },
    });

    // In production: dispatch to external webhook URL configured for partner
    // For now, mark as processed immediately (simulating internal delivery)
    await this.prisma.webhookEvent.update({ where: { id: ev.id }, data: { processed: true, processedAt: new Date() } });

    return { idempotent: false, id: ev.id, signature };
  }

  // ===== 3. Mark as processed (external ack) =====
  @Post(":id/ack")
  async ack(@Req() req: any, @Param("id", new ParseUUIDPipe()) id: string) {
    const ev = await this.prisma.webhookEvent.findFirst({ where: { id, partnerId: req.partnerUser.partnerId } });
    if (!ev) throw new BadRequestException({ code: "NOT_FOUND" });
    await this.prisma.webhookEvent.update({ where: { id }, data: { processed: true, processedAt: new Date() } });
    return { ok: true };
  }
}
