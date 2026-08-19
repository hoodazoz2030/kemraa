import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §13 — Tool Executor
 * Executes tools safely via allow-list. Each tool maps to an internal service call.
 * In this phase: sandbox/mock execution. Real provider integration in Module 8.
 */
@Injectable()
export class ThothToolExecutor {
  private readonly logger = new Logger(ThothToolExecutor.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(params: {
    toolName: string;
    payload: any;
    userId?: string;
  }): Promise<{ success: boolean; result: any; error?: string }> {
    const { toolName, payload, userId } = params;
    const startedAt = Date.now();

    try {
      // Route tool to appropriate sandbox handler
      switch (toolName) {
        case "search_services":
          return await this.searchServices(payload);
        case "get_service_details":
          return await this.getServiceDetails(payload);
        case "get_availability":
          return await this.getAvailability(payload);
        case "create_itinerary_draft":
          return await this.createItineraryDraft(payload, userId);
        case "calculate_budget":
          return this.calculateBudget(payload);
        case "create_booking_draft":
          return await this.createBookingDraft(payload, userId);
        case "create_payment_intent":
          return await this.createPaymentIntent(payload, userId);
        case "estimate_ride":
          return await this.estimateRide(payload);
        case "send_notification":
          return await this.sendNotification(payload, userId);
        case "create_support_ticket":
          return await this.createSupportTicket(payload, userId);
        case "search_destination_knowledge":
          return await this.searchDestinationKnowledge(payload);
        default:
          return {
            success: true,
            result: {
              tool: toolName,
              note: "Mock response (tool registered but not yet wired to provider)",
              payload,
            },
          };
      }
    } catch (err: any) {
      this.logger.error(`Tool ${toolName} failed: ${err.message}`);
      return { success: false, result: null, error: err.message };
    }
  }

  private async searchServices(payload: any) {
    const services = await this.prisma.service.findMany({
      where: payload.type ? { type: payload.type } : {},
      take: 10,
      include: { provider: { include: { organization: { select: { displayName: true } } } } },
    });
    return {
      success: true,
      result: {
        count: services.length,
        items: services.map((s: any) => ({
          id: s.id,
          title: s.title,
          type: s.type,
          provider: s.provider?.organization?.displayName,
        })),
      },
    };
  }

  private async getServiceDetails(payload: any) {
    if (!payload.serviceId) return { success: false, result: null, error: "serviceId required" };
    const service = await this.prisma.service.findUnique({
      where: { id: payload.serviceId },
      include: { provider: true },
    });
    if (!service) return { success: false, result: null, error: "Not found" };
    return { success: true, result: service };
  }

  private async getAvailability(payload: any) {
    // Mock: in real flow, this calls provider adapter
    return {
      success: true,
      result: {
        available: true,
        slots: ["2026-09-01", "2026-09-02", "2026-09-03"],
        note: "Mock availability from sandbox",
      },
    };
  }

  private async createItineraryDraft(payload: any, userId?: string) {
    if (!userId) return { success: false, result: null, error: "userId required" };
    const trip = await this.prisma.trip.create({
      data: {
        travelerId: userId,
        title: payload.title || "THOTH draft trip",
        destinationCountry: payload.destination || "EG",
        startAt: new Date(payload.startAt || Date.now() + 86400000 * 7),
        endAt: new Date(payload.endAt || Date.now() + 86400000 * 14),
        budgetMinor: payload.budgetMinor || 500000,
        currency: payload.currency || "EGP",
        status: "DRAFT" as any,
      },
    });
    return { success: true, result: { tripId: trip.id, status: "DRAFT" } };
  }

  private calculateBudget(payload: any) {
    const nights = payload.nights || 3;
    const perNight = payload.perNightMinor || 100000;
    const total = nights * perNight;
    return {
      success: true,
      result: {
        nights,
        perNightMinor: perNight,
        totalMinor: total,
        currency: payload.currency || "EGP",
        formatted: `${payload.currency || "EGP"} ${(total / 100).toFixed(2)}`,
      },
    };
  }

  private async createBookingDraft(payload: any, userId?: string) {
    // Mock: would create Booking with DRAFT status
    return {
      success: true,
      result: {
        bookingId: `draft_${Date.now()}`,
        status: "DRAFT",
        note: "Booking draft created - requires PENDING_APPROVAL transition",
      },
    };
  }

  private async createPaymentIntent(payload: any, userId?: string) {
    return {
      success: true,
      result: {
        paymentId: `pi_${Date.now()}`,
        amountMinor: payload.amountMinor,
        currency: payload.currency || "EGP",
        status: "CREATED",
        note: "Payment intent created - requires AUTHORIZED transition",
      },
    };
  }

  private async estimateRide(payload: any) {
    // Mock fare calculation
    const distanceKm = payload.distanceKm || 10;
    const baseFareMinor = 2000;
    const perKmMinor = 500;
    const total = baseFareMinor + distanceKm * perKmMinor;
    return {
      success: true,
      result: {
        fareMinor: total,
        currency: "EGP",
        formatted: `EGP ${(total / 100).toFixed(2)}`,
        etaMinutes: Math.round(distanceKm * 2),
      },
    };
  }

  private async sendNotification(payload: any, userId?: string) {
    if (!userId) return { success: false, result: null, error: "userId required" };
    await this.prisma.notification.create({
      data: {
        userId,
        channel: payload.channel || "push",
        type: payload.type || "THOTH_MESSAGE",
        title: payload.title || "From THOTH",
        body: payload.body || "",
        status: "QUEUED" as any,
      },
    });
    return { success: true, result: { sent: true } };
  }

  private async createSupportTicket(payload: any, userId?: string) {
    if (!userId) return { success: false, result: null, error: "userId required" };
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        category: payload.category || "OTHER",
        subject: payload.subject || "THOTH generated",
        body: payload.body || "",
        priority: "MEDIUM" as any,
        status: "OPEN" as any,
      },
    });
    return { success: true, result: { ticketId: ticket.id } };
  }

  private async searchDestinationKnowledge(payload: any) {
    // Mock destination knowledge
    const destination = payload.destination || "Egypt";
    return {
      success: true,
      result: {
        destination,
        highlights: [
          "Pyramids of Giza",
          "Luxor Temple",
          "Red Sea diving",
          "Khan el-Khalili market",
        ],
        bestTime: "October-April",
        currency: "EGP",
        note: "Mock destination knowledge",
      },
    };
  }
}
