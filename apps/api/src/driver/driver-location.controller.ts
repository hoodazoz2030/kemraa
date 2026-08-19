import { Controller, Post, Body, UseGuards, Req, SetMetadata, Logger } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §18 — Driver location updates (real-time tracking).
 */
@ApiTags("driver-location")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("driver-location")
export class DriverLocationController {
  private readonly logger = new Logger(DriverLocationController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Update driver's current location.
   * This would typically push to Redis for real-time tracking.
   * For now, we log to the current ride's events if driver has an active ride.
   */
  @Post("update")
  @SetMetadata("roles", ["DRIVER"])
  async updateLocation(@Req() req: any, @Body() body: {
    lat: number;
    lng: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
  }) {
    if (body.lat === undefined || body.lng === undefined) {
      return { error: { code: "INVALID_COORDS" } };
    }

    // Find active ride for this driver
    const activeRide = await this.prisma.ride.findFirst({
      where: {
        driverId: req.user.sub,
        status: { in: ["DRIVER_ASSIGNED", "DRIVER_ARRIVING", "IN_PROGRESS"] as any },
      },
    });

    if (activeRide) {
      // Log location as event
      await this.prisma.rideEvent.create({
        data: {
          rideId: activeRide.id,
          type: "LOCATION_UPDATE",
          payload: {
            lat: body.lat,
            lng: body.lng,
            accuracy: body.accuracy ?? null,
            heading: body.heading ?? null,
            speed: body.speed ?? null,
            driverId: req.user.sub,
          } as any,
        },
      });
    }

    // In production: also push to Redis pubsub for customer app to track
    // For now: just acknowledge
    return {
      success: true,
      lat: body.lat,
      lng: body.lng,
      activeRideId: activeRide?.id ?? null,
      timestamp: new Date().toISOString(),
    };
  }
}
