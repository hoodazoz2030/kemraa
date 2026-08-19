import { Controller, Post, Get, Param, Body, Req, Headers, Logger, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service.js";
import { AdapterRegistry } from "./adapter-registry.service.js";

/**
 * §24 — Provider Webhook Endpoints.
 * Receives async confirmations / status updates from real providers.
 * Public (no auth) — validated via signature in production.
 */
@ApiTags("adapter-webhooks")
@Controller("adapters/webhooks")
export class AdapterWebhooksController {
  private readonly logger = new Logger(AdapterWebhooksController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AdapterRegistry,
  ) {}

  /**
   * POST /adapters/webhooks/:providerCode
   * Generic webhook endpoint — one per provider code.
   */
  @Post(":providerCode")
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Param("providerCode") providerCode: string,
    @Body() body: any,
    @Req() req: any,
    @Headers("x-signature") signature?: string,
    @Headers("x-event-type") eventType?: string,
  ) {
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    // Validate provider exists
    const adapter = this.registry.get(providerCode);
    if (!adapter) {
      this.logger.warn(`Webhook for unknown provider: ${providerCode}`);
      return { received: false, error: "UNKNOWN_PROVIDER" };
    }

    // Log event to DB
    const event = await this.prisma.providerWebhookEvent.create({
      data: {
        providerCode,
        eventType: eventType || (body?.event || "UNKNOWN"),
        externalRef: body?.externalRef || body?.booking_id || body?.reference || null,
        payload: (body || {}) as any,
        rawBody,
        signature: signature ?? null,
        status: "RECEIVED",
      },
    });

    this.logger.log(`Webhook received: ${providerCode} / ${event.eventType} (${event.id})`);

    // In production: verify signature, update booking status, emit events
    // For mock: just acknowledge
    await this.prisma.providerWebhookEvent.update({
      where: { id: event.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });

    return {
      received: true,
      eventId: event.id,
      providerCode,
      eventType: event.eventType,
    };
  }

  /**
   * GET /adapters/webhooks — list recent webhook events (admin).
   */
  @Get()
  async listEvents() {
    const events = await this.prisma.providerWebhookEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { events, total: events.length };
  }

  /**
   * GET /adapters/webhooks/:providerCode/:eventId
   */
  @Get(":providerCode/:eventId")
  async getEvent(@Param("providerCode") providerCode: string, @Param("eventId") eventId: string) {
    const event = await this.prisma.providerWebhookEvent.findFirst({
      where: { id: eventId, providerCode },
    });
    if (!event) return { error: { code: "NOT_FOUND" } };
    return event;
  }
}
