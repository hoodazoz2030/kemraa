import { Controller, Get, Post, Body, UseGuards, Req, Param, SetMetadata, Logger } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §12 + §18 — Customer-facing Ride endpoints.
 * Matches schema: riderId (not userId), pickup/dropoff as Json.
 */
@ApiTags("customer-rides")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("customer-rides")
export class CustomerRidesController {
  private readonly logger = new Logger(CustomerRidesController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Estimate fare for a ride.
   */
  @Post("estimate")
  @SetMetadata("roles", ["CUSTOMER"])
  async estimate(@Body() body: { pickupLat: number; pickupLng: number; dropoffLat: number; dropoffLng: number; rideType?: string }) {
    const R = 6371;
    const dLat = ((body.dropoffLat - body.pickupLat) * Math.PI) / 180;
    const dLon = ((body.dropoffLng - body.pickupLng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((body.pickupLat * Math.PI) / 180) * Math.cos((body.dropoffLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const baseFareMinor = 2000;
    const perKmMinor = 500;
    const fareMinor = baseFareMinor + Math.round(distanceKm * perKmMinor);

    return {
      fareMinor,
      currency: "EGP",
      formatted: `EGP ${(fareMinor / 100).toFixed(2)}`,
      distanceKm: Math.round(distanceKm * 100) / 100,
      etaMinutes: Math.round(distanceKm * 2),
      rideType: body.rideType || "STANDARD",
    };
  }

  /**
   * Request a ride — creates Ride entity with riderId + pickup/dropoff Json.
   */
  @Post()
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("ride.request", "ride")
  async request(@Req() req: any, @Body() body: {
    pickupLat: number; pickupLng: number; pickupAddress?: string;
    dropoffLat: number; dropoffLng: number; dropoffAddress?: string;
    rideType?: string; fareMinor?: number; tripId?: string;
  }) {
    try {
      const ride = await this.prisma.ride.create({
        data: {
          riderId: req.user.sub,
          pickup: { lat: body.pickupLat, lng: body.pickupLng, address: body.pickupAddress ?? null } as any,
          dropoff: { lat: body.dropoffLat, lng: body.dropoffLng, address: body.dropoffAddress ?? null } as any,
          fareMinor: body.fareMinor ?? 0,
          currency: "EGP",
          status: "REQUESTED" as any,
          tripId: body.tripId ?? null,
        },
      });
      this.logger.log(`Ride requested: ${ride.id}`);
      return ride;
    } catch (err: any) {
      this.logger.error(`Ride request failed: ${err.message}`);
      return { error: { code: "CREATE_FAILED", message: err.message } };
    }
  }

  /**
   * List user's rides (using riderId).
   */
  @Get()
  @SetMetadata("roles", ["CUSTOMER"])
  async list(@Req() req: any) {
    const rides = await this.prisma.ride.findMany({
      where: { riderId: req.user.sub },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return { items: rides, total: rides.length };
  }

  /**
   * Get ride detail.
   */
  @Get(":id")
  @SetMetadata("roles", ["CUSTOMER"])
  async get(@Req() req: any, @Param("id") id: string) {
    const ride = await this.prisma.ride.findFirst({
      where: { id, riderId: req.user.sub },
      include: {
        driver: true,
        events: { take: 10 },
      },
    });
    if (!ride) return { error: { code: "NOT_FOUND" } };
    return ride;
  }

  /**
   * Cancel ride (only if REQUESTED or MATCHING).
   */
  @Post(":id/cancel")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("ride.cancel", "ride")
  async cancel(@Req() req: any, @Param("id") id: string) {
    const ride = await this.prisma.ride.findFirst({ where: { id, riderId: req.user.sub } });
    if (!ride) return { error: { code: "NOT_FOUND" } };
    if (!["REQUESTED", "MATCHING"].includes(ride.status)) {
      return { error: { code: "INVALID_STATE", message: "Only REQUESTED/MATCHING can be cancelled" } };
    }
    return await this.prisma.ride.update({
      where: { id },
      data: { status: "CANCELLED" as any },
    });
  }
}
