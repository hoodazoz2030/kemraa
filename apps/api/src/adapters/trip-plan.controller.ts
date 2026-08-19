import { Controller, Post, Get, Body, UseGuards, Req, Param, SetMetadata, Logger } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { AdapterOrchestrator } from "./adapter-orchestrator.service.js";
import { AdapterRegistry } from "./adapter-registry.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §24 — TripPlan orchestrator.
 * Allows customer to plan a full trip (flight + hotel + activity) and book across adapters.
 *
 * BookingStatus valid values: DRAFT, PENDING_APPROVAL, PAYMENT_PENDING, CONFIRMING, CONFIRMED,
 *                              REJECTED, FAILED, CANCEL_REQUESTED, CANCELLED, COMPLETED, DISPUTED
 */
@ApiTags("trip-plan")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("trip-plan")
export class TripPlanController {
  private readonly logger = new Logger(TripPlanController.name);

  constructor(
    private readonly orchestrator: AdapterOrchestrator,
    private readonly registry: AdapterRegistry,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Plan a full trip: search across all service types.
   */
  @Post("search")
  @SetMetadata("roles", ["CUSTOMER", "ADMIN"])
  async planTrip(@Req() req: any, @Body() body: {
    origin?: string;
    destination?: string;
    departureDate?: string;
    returnDate?: string;
    passengers?: number;
    city?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    rooms?: number;
    activities?: boolean;
  }) {
    const results: any = {};

    if (body.origin && body.destination) {
      const flights = await this.orchestrator.searchAll("FLIGHT", {
        origin: body.origin,
        destination: body.destination,
        departureDate: body.departureDate,
        returnDate: body.returnDate,
        passengers: body.passengers || 1,
      });
      results.flights = flights;
    }

    if (body.city) {
      const hotels = await this.orchestrator.searchAll("HOTEL", {
        city: body.city,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        guests: body.guests || 2,
        rooms: body.rooms || 1,
      });
      results.hotels = hotels;
    }

    if (body.activities && body.city) {
      const activities = await this.orchestrator.searchAll("ACTIVITY", {
        location: body.city,
        date: body.checkIn,
      });
      results.activities = activities;
    }

    this.logger.log(`Trip plan search: flights=${results.flights?.total || 0}, hotels=${results.hotels?.total || 0}, activities=${results.activities?.total || 0}`);
    return results;
  }

  /**
   * Book a full trip (flight + hotel + activity).
   */
  @Post("book")
  @SetMetadata("roles", ["CUSTOMER", "ADMIN"])
  @Audit("trip.book_full", "trip")
  async bookTrip(@Req() req: any, @Body() body: {
    flight?: { providerCode: string; externalId: string; totalMinor: number; currency: string; items: any[] };
    hotel?: { providerCode: string; externalId: string; totalMinor: number; currency: string; items: any[] };
    activity?: { providerCode: string; externalId: string; totalMinor: number; currency: string; items: any[] };
    tripId?: string;
  }) {
    const bookings: any = {};
    const totalMinor = (body.flight?.totalMinor || 0) + (body.hotel?.totalMinor || 0) + (body.activity?.totalMinor || 0);
    const currency = body.flight?.currency || body.hotel?.currency || body.activity?.currency || "EGP";

    // Use DRAFT as initial status (valid BookingStatus)
    const masterBooking = await this.prisma.booking.create({
      data: {
        travelerId: req.user.sub,
        providerId: "TRIP_PLAN",
        serviceId: "FULL_TRIP",
        status: "DRAFT" as any,
        totalMinor,
        currency,
        items: { flight: !!body.flight, hotel: !!body.hotel, activity: !!body.activity } as any,
        idempotencyKey: `trip_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        tripId: body.tripId ?? null,
      },
    });

    // Book flight if provided
    if (body.flight) {
      try {
        const adapter = this.registry.get(body.flight.providerCode);
        if (adapter) {
          const result = await adapter.book({
            externalId: body.flight.externalId,
            items: body.flight.items,
            travelerId: req.user.sub,
            bookingId: masterBooking.id,
            totalMinor: body.flight.totalMinor,
            currency: body.flight.currency,
          });
          bookings.flight = result;
        }
      } catch (err: any) {
        bookings.flight = { error: err.message };
      }
    }

    if (body.hotel) {
      try {
        const adapter = this.registry.get(body.hotel.providerCode);
        if (adapter) {
          const result = await adapter.book({
            externalId: body.hotel.externalId,
            items: body.hotel.items,
            travelerId: req.user.sub,
            bookingId: masterBooking.id,
            totalMinor: body.hotel.totalMinor,
            currency: body.hotel.currency,
          });
          bookings.hotel = result;
        }
      } catch (err: any) {
        bookings.hotel = { error: err.message };
      }
    }

    if (body.activity) {
      try {
        const adapter = this.registry.get(body.activity.providerCode);
        if (adapter) {
          const result = await adapter.book({
            externalId: body.activity.externalId,
            items: body.activity.items,
            travelerId: req.user.sub,
            bookingId: masterBooking.id,
            totalMinor: body.activity.totalMinor,
            currency: body.activity.currency,
          });
          bookings.activity = result;
        }
      } catch (err: any) {
        bookings.activity = { error: err.message };
      }
    }

    // Use CONFIRMING if not all confirmed, else CONFIRMED (both valid enum values)
    const allConfirmed = Object.values(bookings).every((b: any) => b.status === "CONFIRMED");
    const finalStatus = allConfirmed ? "CONFIRMED" : "CONFIRMING";

    await this.prisma.booking.update({
      where: { id: masterBooking.id },
      data: { status: finalStatus as any },
    });

    this.logger.log(`Trip booked: ${masterBooking.id} — flight=${bookings.flight?.status}, hotel=${bookings.hotel?.status}, activity=${bookings.activity?.status}`);

    return {
      bookingId: masterBooking.id,
      status: finalStatus,
      totalMinor,
      currency,
      bookings,
    };
  }

  @Get(":bookingId")
  @SetMetadata("roles", ["CUSTOMER", "ADMIN"])
  async getTripPlan(@Req() req: any, @Param("bookingId") bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, travelerId: req.user.sub },
      include: { payments: true },
    });
    if (!booking) return { error: { code: "NOT_FOUND" } };
    return booking;
  }
}
