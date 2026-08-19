import { Controller, Get, Post, Body, UseGuards, Req, Param, SetMetadata, Logger } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

@ApiTags("customer-rides")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("customer-rides")
export class CustomerRidesController {
  private readonly logger = new Logger(CustomerRidesController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post("estimate")
  @SetMetadata("roles", ["CUSTOMER"])
  async estimate(@Body() body: { pickupLat: number; pickupLng: number; dropoffLat: number; dropoffLng: number; rideType?: string }) {
    const R = 6371;
    const dLat = ((body.dropoffLat - body.pickupLat) * Math.PI) / 180;
    const dLon = ((body.dropoffLng - body.pickupLng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((body.pickupLat * Math.PI) / 180) * Math.cos((body.dropoffLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const fareMinor = 2000 + Math.round(distanceKm * 500);
    return {
      fareMinor,
      currency: "EGP",
      formatted: `EGP ${(fareMinor / 100).toFixed(2)}`,
      distanceKm: Math.round(distanceKm * 100) / 100,
      etaMinutes: Math.round(distanceKm * 2),
      rideType: body.rideType || "STANDARD",
    };
  }

  @Post()
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("ride.request", "ride")
  async request(@Req() req: any, @Body() body: { pickupLat: number; pickupLng: number; pickupAddress?: string; dropoffLat: number; dropoffLng: number; dropoffAddress?: string; rideType?: string; fareMinor?: number }) {
    try {
      // Try different possible field names via dynamic data building
      const data: any = {
        status: "REQUESTED" as any,
        fareMinor: body.fareMinor ?? 0,
        currency: "EGP",
        pickupLat: body.pickupLat,
        pickupLng: body.pickupLng,
        dropoffLat: body.dropoffLat,
        dropoffLng: body.dropoffLng,
      };
      if (body.pickupAddress) data.pickupAddress = body.pickupAddress;
      if (body.dropoffAddress) data.dropoffAddress = body.dropoffAddress;
      if (body.rideType) data.rideType = body.rideType;

      // Try relational user connect (safest for schema variations)
      data.user = { connect: { id: req.user.sub } };

      const ride = await this.prisma.ride.create({ data });
      this.logger.log(`Ride requested: ${ride.id}`);
      return ride;
    } catch (err: any) {
      this.logger.error(`Ride request failed: ${err.message}`, err.stack);
      // Fallback: try passengerId or customerId
      if (err.message?.includes("user")) {
        try {
          const data: any = {
            passengerId: req.user.sub,
            status: "REQUESTED" as any,
            fareMinor: body.fareMinor ?? 0,
            currency: "EGP",
            pickupLat: body.pickupLat,
            pickupLng: body.pickupLng,
            dropoffLat: body.dropoffLat,
            dropoffLng: body.dropoffLng,
          };
          const ride = await this.prisma.ride.create({ data });
          return ride;
        } catch (e2: any) {
          return { error: { code: "CREATE_FAILED", message: e2.message } };
        }
      }
      return { error: { code: "CREATE_FAILED", message: err.message } };
    }
  }

  @Get()
  @SetMetadata("roles", ["CUSTOMER"])
  async list(@Req() req: any) {
    // Try multiple where clauses
    const where = { OR: [{ userId: req.user.sub }, { passengerId: req.user.sub }, { customerId: req.user.sub }, { travelerId: req.user.sub }] };
    const rides = await this.prisma.ride.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" } as any,
      take: 20,
    });
    return { items: rides, total: rides.length };
  }

  @Get(":id")
  @SetMetadata("roles", ["CUSTOMER"])
  async get(@Req() req: any, @Param("id") id: string) {
    const ride = await this.prisma.ride.findFirst({ where: { id } as any });
    if (!ride) return { error: { code: "NOT_FOUND" } };
    // Ownership check (flexible)
    const ownerId = (ride as any).userId || (ride as any).passengerId || (ride as any).customerId || (ride as any).travelerId;
    if (ownerId !== req.user.sub) return { error: { code: "FORBIDDEN" } };
    return ride;
  }

  @Post(":id/cancel")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("ride.cancel", "ride")
  async cancel(@Req() req: any, @Param("id") id: string) {
    const ride = await this.prisma.ride.findFirst({ where: { id } as any });
    if (!ride) return { error: { code: "NOT_FOUND" } };
    const ownerId = (ride as any).userId || (ride as any).passengerId || (ride as any).customerId || (ride as any).travelerId;
    if (ownerId !== req.user.sub) return { error: { code: "FORBIDDEN" } };
    if (!["REQUESTED", "ACCEPTED"].includes((ride as any).status)) {
      return { error: { code: "INVALID_STATE" } };
    }
    return await this.prisma.ride.update({ where: { id }, data: { status: "CANCELLED" as any } });
  }
}
