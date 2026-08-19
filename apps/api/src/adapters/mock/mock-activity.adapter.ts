import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  ActivityAdapter,
  ProviderIdentity,
  SearchParams,
  SearchResult,
  BookParams,
  BookResult,
  CancelParams,
  CancelResult,
  StatusResult,
} from "../interfaces/adapter.interface.js";

/**
 * §24 — Mock Activity Adapter (tours, experiences, attractions).
 * Swappable with GetYourGuide / Viator / Klook adapters.
 */
@Injectable()
export class MockActivityAdapter implements ActivityAdapter {
  private readonly logger = new Logger(MockActivityAdapter.name);
  private readonly bookings = new Map<string, { status: string; details: any }>();

  getIdentity(): ProviderIdentity & { serviceType: "ACTIVITY" } {
    return {
      id: "mock-activity-001",
      name: "Mock Activity Provider",
      code: "MOCK_ACTIVITY",
      serviceType: "ACTIVITY" as const,
      enabled: true,
    };
  }

  async search(params: SearchParams): Promise<SearchResult[]> {
    return this.searchActivities(params.query);
  }

  async searchActivities(params: {
    location: string;
    date?: string;
    category?: string;
  }): Promise<SearchResult[]> {
    this.logger.log(`[MockActivity] Search: ${params.location}`);
    await new Promise((r) => setTimeout(r, 90));

    const activities = [
      { name: "Pyramids & Sphinx Full Day Tour", category: "TOUR", price: 150000, duration: "8h" },
      { name: "Nile Dinner Cruise", category: "CRUISE", price: 120000, duration: "3h" },
      { name: "Egyptian Museum Guided Tour", category: "CULTURAL", price: 65000, duration: "4h" },
      { name: "Desert Safari with BBQ", category: "ADVENTURE", price: 180000, duration: "6h" },
      { name: "Khan el-Khalili Walking Tour", category: "CULTURAL", price: 45000, duration: "3h" },
    ];

    const filtered = params.category
      ? activities.filter((a) => a.category === params.category)
      : activities;

    return filtered.map((act, i) => ({
      providerId: this.getIdentity().id,
      externalId: `ACT-${params.location.toUpperCase()}-${Date.now()}-${i}`,
      title: act.name,
      description: `${act.category} experience in ${params.location} (${act.duration})`,
      priceMinor: act.price,
      currency: "EGP",
      availability: { slots: 20 - i * 3 },
      details: {
        activityName: act.name,
        category: act.category,
        location: params.location,
        date: params.date,
        duration: act.duration,
        includes: ["Guide", "Transport", "Entrance fees"].slice(0, 3 - (i % 2)),
      },
    }));
  }

  async book(params: BookParams): Promise<BookResult> {
    this.logger.log(`[MockActivity] Booking ${params.externalId}`);
    await new Promise((r) => setTimeout(r, 130));

    const externalRef = `ACT-${randomUUID().substring(0, 8).toUpperCase()}`;
    this.bookings.set(externalRef, {
      status: "CONFIRMED",
      details: {
        externalId: params.externalId,
        bookingId: params.bookingId,
        totalMinor: params.totalMinor,
        items: params.items,
        bookedAt: new Date().toISOString(),
      },
    });

    return {
      providerId: this.getIdentity().id,
      externalRef,
      status: "CONFIRMED",
      details: { voucherCode: externalRef, meetingPoint: "Hotel lobby" },
    };
  }

  async cancel(params: CancelParams): Promise<CancelResult> {
    this.logger.log(`[MockActivity] Cancelling ${params.externalRef}`);
    await new Promise((r) => setTimeout(r, 80));

    const booking = this.bookings.get(params.externalRef);
    if (!booking) return { success: false, refundEligible: false, details: { error: "NOT_FOUND" } };

    this.bookings.set(params.externalRef, { ...booking, status: "CANCELLED" });
    return { success: true, refundEligible: true };
  }

  async checkStatus(externalRef: string): Promise<StatusResult> {
    const booking = this.bookings.get(externalRef);
    if (!booking) return { externalRef, status: "FAILED", details: { error: "NOT_FOUND" } };
    return { externalRef, status: booking.status as any, details: booking.details };
  }
}
