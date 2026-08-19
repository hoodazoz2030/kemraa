import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  HotelAdapter,
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
 * §24 — Mock Hotel Adapter (simulates real hotel booking API).
 * Swappable with Booking.com / Expedia / Hotels.com adapters.
 */
@Injectable()
export class MockHotelAdapter implements HotelAdapter {
  private readonly logger = new Logger(MockHotelAdapter.name);
  private readonly bookings = new Map<string, { status: string; details: any }>();

  getIdentity(): ProviderIdentity & { serviceType: "HOTEL" } {
    return {
      id: "mock-hotel-001",
      name: "Mock Hotel Provider",
      code: "MOCK_HOTEL",
      serviceType: "HOTEL" as const,
      enabled: true,
    };
  }

  async search(params: SearchParams): Promise<SearchResult[]> {
    return this.searchHotels(params.query);
  }

  async searchHotels(params: {
    city: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    rooms: number;
  }): Promise<SearchResult[]> {
    this.logger.log(`[MockHotel] Search: ${params.city} (${params.checkIn} → ${params.checkOut})`);
    await new Promise((r) => setTimeout(r, 120));

    const hotels = [
      { name: "Grand Cairo Hotel", stars: 5, basePrice: 250000 },
      { name: "Pyramids View Resort", stars: 5, basePrice: 320000 },
      { name: "Nile Palace Hotel", stars: 4, basePrice: 180000 },
      { name: "City Center Inn", stars: 3, basePrice: 95000 },
      { name: "Budget Stay Hotel", stars: 2, basePrice: 55000 },
    ];

    const nights = Math.max(1, Math.ceil(
      (new Date(params.checkOut).getTime() - new Date(params.checkIn).getTime()) / (1000 * 60 * 60 * 24)
    ));

    return hotels.map((hotel, i) => ({
      providerId: this.getIdentity().id,
      externalId: `HTL-${params.city.toUpperCase()}-${Date.now()}-${i}`,
      title: `${hotel.name} ★${hotel.stars}`,
      description: `${hotel.stars}-star hotel in ${params.city}, ${params.rooms} room(s) for ${params.guests} guest(s)`,
      priceMinor: hotel.basePrice * nights * params.rooms,
      currency: "EGP",
      availability: { rooms: 10 - i * 2 },
      details: {
        hotelName: hotel.name,
        stars: hotel.stars,
        city: params.city,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        nights,
        rooms: params.rooms,
        guests: params.guests,
        amenities: ["WiFi", "Breakfast", "Pool", "Spa"].slice(0, hotel.stars),
      },
    }));
  }

  async book(params: BookParams): Promise<BookResult> {
    this.logger.log(`[MockHotel] Booking ${params.externalId} for booking ${params.bookingId}`);
    await new Promise((r) => setTimeout(r, 180));

    const externalRef = `HTL-${randomUUID().substring(0, 8).toUpperCase()}`;
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
      details: {
        confirmationNumber: externalRef,
        checkInCode: `CI${Math.floor(Math.random() * 1e6)}`,
      },
    };
  }

  async cancel(params: CancelParams): Promise<CancelResult> {
    this.logger.log(`[MockHotel] Cancelling ${params.externalRef}`);
    await new Promise((r) => setTimeout(r, 100));

    const booking = this.bookings.get(params.externalRef);
    if (!booking) return { success: false, refundEligible: false, details: { error: "NOT_FOUND" } };

    this.bookings.set(params.externalRef, { ...booking, status: "CANCELLED" });
    return { success: true, refundEligible: true, details: { refundPolicy: "Free cancellation up to 24h before" } };
  }

  async checkStatus(externalRef: string): Promise<StatusResult> {
    const booking = this.bookings.get(externalRef);
    if (!booking) {
      return { externalRef, status: "FAILED", details: { error: "NOT_FOUND" } };
    }
    return { externalRef, status: booking.status as any, details: booking.details };
  }
}
