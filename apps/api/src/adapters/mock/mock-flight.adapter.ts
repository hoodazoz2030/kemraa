import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  FlightAdapter,
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
 * §24 — Mock Flight Adapter (simulates real flight provider API).
 * Used for development + testing. Swappable with Sabre/Amadeus/etc.
 */
@Injectable()
export class MockFlightAdapter implements FlightAdapter {
  private readonly logger = new Logger(MockFlightAdapter.name);
  private readonly bookings = new Map<string, { status: string; details: any }>();

  getIdentity(): ProviderIdentity & { serviceType: "FLIGHT" } {
    return {
      id: "mock-flight-001",
      name: "Mock Flight Provider",
      code: "MOCK_FLIGHT",
      serviceType: "FLIGHT" as const,
      enabled: true,
    };
  }

  async search(params: SearchParams): Promise<SearchResult[]> {
    return this.searchFlights(params.query);
  }

  async searchFlights(params: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
    cabin?: "ECONOMY" | "BUSINESS" | "FIRST";
  }): Promise<SearchResult[]> {
    this.logger.log(`[MockFlight] Search: ${params.origin} → ${params.destination} on ${params.departureDate}`);

    // Simulate search delay
    await new Promise((r) => setTimeout(r, 100));

    const cabin = params.cabin || "ECONOMY";
    const basePrice = cabin === "ECONOMY" ? 350000 : cabin === "BUSINESS" ? 1500000 : 3000000;
    const airlines = ["EGYPTAIR", "EMIRATES", "SAUDIA", "QATAR", "TURKISH"];

    // Generate 5 mock results
    return airlines.map((airline, i) => ({
      providerId: this.getIdentity().id,
      externalId: `FLT-${params.origin}${params.destination}-${Date.now()}-${i}`,
      title: `${airline} ${params.origin}→${params.destination}`,
      description: `${cabin} class, ${params.passengers} passenger(s)`,
      priceMinor: basePrice + i * 25000 + Math.floor(Math.random() * 15000),
      currency: "EGP",
      availability: { seats: 10 - i * 2 },
      details: {
        airline,
        flightNumber: `${airline.substring(0, 2)}${100 + i}`,
        origin: params.origin,
        destination: params.destination,
        departureDate: params.departureDate,
        returnDate: params.returnDate,
        cabin,
        duration: "3h 45m",
        stops: i % 3 === 0 ? 0 : 1,
      },
    }));
  }

  async book(params: BookParams): Promise<BookResult> {
    this.logger.log(`[MockFlight] Booking ${params.externalId} for booking ${params.bookingId}`);
    await new Promise((r) => setTimeout(r, 150));

    const externalRef = `MS-${randomUUID().substring(0, 8).toUpperCase()}`;
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
      details: { pnr: externalRef, eTicketNumber: `077${Math.floor(Math.random() * 1e10)}` },
    };
  }

  async cancel(params: CancelParams): Promise<CancelResult> {
    this.logger.log(`[MockFlight] Cancelling ${params.externalRef}`);
    await new Promise((r) => setTimeout(r, 100));

    const booking = this.bookings.get(params.externalRef);
    if (!booking) return { success: false, refundEligible: false, details: { error: "NOT_FOUND" } };

    this.bookings.set(params.externalRef, { ...booking, status: "CANCELLED" });
    return { success: true, refundEligible: true, details: { refundAmountMinor: 90 } };
  }

  async checkStatus(externalRef: string): Promise<StatusResult> {
    const booking = this.bookings.get(externalRef);
    if (!booking) {
      return { externalRef, status: "FAILED", details: { error: "NOT_FOUND" } };
    }
    return { externalRef, status: booking.status as any, details: booking.details };
  }
}
