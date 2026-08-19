import { Controller, Post, Body, UseGuards, Req, Param, SetMetadata, Logger } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §18 — Driver ride state machine.
 * Flow: DRIVER_ASSIGNED → DRIVER_ARRIVING → DRIVER_ARRIVED → IN_PROGRESS → COMPLETED
 */
@ApiTags("driver-rides-state")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("driver-rides")
export class DriverRidesStateController {
  private readonly logger = new Logger(DriverRidesStateController.name);

  constructor(private readonly prisma: PrismaService) {}

  private async validateDriverOwnership(driverId: string, rideId: string) {
    const ride = await this.prisma.ride.findFirst({
      where: { id: rideId, driverId },
    });
    return ride;
  }

  /**
   * DRIVER_ASSIGNED → DRIVER_ARRIVING (driver is on the way to pickup).
   */
  @Post(":id/arriving")
  @SetMetadata("roles", ["DRIVER"])
  @Audit("driver.ride.arriving", "ride")
  async startHeadingToPickup(@Req() req: any, @Param("id") id: string, @Body() body: { lat?: number; lng?: number } = {}) {
    const ride = await this.validateDriverOwnership(req.user.sub, id);
    if (!ride) return { error: { code: "NOT_FOUND" } };
    if (ride.status !== "DRIVER_ASSIGNED") {
      return { error: { code: "INVALID_STATE", message: `Expected DRIVER_ASSIGNED, got ${ride.status}` } };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ride.update({
        where: { id },
        data: { status: "DRIVER_ARRIVING" as any },
      });

      await tx.rideEvent.create({
        data: {
          rideId: id,
          type: "DRIVER_ARRIVING",
          payload: {
            actorId: req.user.sub,
            actorType: "DRIVER",
            lat: body.lat ?? null,
            lng: body.lng ?? null,
          } as any,
        },
      });

      return updated;
    });

    this.logger.log(`Ride ${id} → DRIVER_ARRIVING`);
    return result;
  }

  /**
   * DRIVER_ARRIVING → DRIVER_ARRIVED (driver at pickup location).
   */
  @Post(":id/arrived")
  @SetMetadata("roles", ["DRIVER"])
  @Audit("driver.ride.arrived", "ride")
  async arrivedAtPickup(@Req() req: any, @Param("id") id: string, @Body() body: { lat?: number; lng?: number } = {}) {
    const ride = await this.validateDriverOwnership(req.user.sub, id);
    if (!ride) return { error: { code: "NOT_FOUND" } };
    if (ride.status !== "DRIVER_ARRIVING") {
      return { error: { code: "INVALID_STATE", message: `Expected DRIVER_ARRIVING, got ${ride.status}` } };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ride.update({
        where: { id },
        data: { status: "DRIVER_ARRIVED" as any },
      });

      await tx.rideEvent.create({
        data: {
          rideId: id,
          type: "DRIVER_ARRIVED",
          payload: {
            actorId: req.user.sub,
            actorType: "DRIVER",
            lat: body.lat ?? null,
            lng: body.lng ?? null,
          } as any,
        },
      });

      return updated;
    });

    this.logger.log(`Ride ${id} → DRIVER_ARRIVED`);
    return result;
  }

  /**
   * DRIVER_ARRIVED → IN_PROGRESS (ride has started — passenger in car).
   */
  @Post(":id/start")
  @SetMetadata("roles", ["DRIVER"])
  @Audit("driver.ride.start", "ride")
  async startRide(@Req() req: any, @Param("id") id: string, @Body() body: { lat?: number; lng?: number; odometerStart?: number } = {}) {
    const ride = await this.validateDriverOwnership(req.user.sub, id);
    if (!ride) return { error: { code: "NOT_FOUND" } };
    if (ride.status !== "DRIVER_ARRIVED") {
      return { error: { code: "INVALID_STATE", message: `Expected DRIVER_ARRIVED, got ${ride.status}` } };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ride.update({
        where: { id },
        data: { status: "IN_PROGRESS" as any },
      });

      await tx.rideEvent.create({
        data: {
          rideId: id,
          type: "RIDE_STARTED",
          payload: {
            actorId: req.user.sub,
            actorType: "DRIVER",
            lat: body.lat ?? null,
            lng: body.lng ?? null,
            odometerStart: body.odometerStart ?? null,
          } as any,
        },
      });

      return updated;
    });

    this.logger.log(`Ride ${id} → IN_PROGRESS`);
    return result;
  }

  /**
   * IN_PROGRESS → COMPLETED (ride finished at dropoff).
   */
  @Post(":id/complete")
  @SetMetadata("roles", ["DRIVER"])
  @Audit("driver.ride.complete", "ride")
  async completeRide(@Req() req: any, @Param("id") id: string, @Body() body: {
    lat?: number;
    lng?: number;
    actualFareMinor?: number;
    odometerEnd?: number;
    notes?: string;
  } = {}) {
    const ride = await this.validateDriverOwnership(req.user.sub, id);
    if (!ride) return { error: { code: "NOT_FOUND" } };
    if (ride.status !== "IN_PROGRESS") {
      return { error: { code: "INVALID_STATE", message: `Expected IN_PROGRESS, got ${ride.status}` } };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updateData: any = { status: "COMPLETED" as any };
      if (body.actualFareMinor !== undefined) updateData.fareMinor = body.actualFareMinor;

      const updated = await tx.ride.update({
        where: { id },
        data: updateData,
      });

      await tx.rideEvent.create({
        data: {
          rideId: id,
          type: "RIDE_COMPLETED",
          payload: {
            actorId: req.user.sub,
            actorType: "DRIVER",
            lat: body.lat ?? null,
            lng: body.lng ?? null,
            odometerEnd: body.odometerEnd ?? null,
            actualFareMinor: body.actualFareMinor ?? null,
            notes: body.notes ?? null,
          } as any,
        },
      });

      // Driver back to ONLINE after completing
      await tx.driver.update({
        where: { userId: req.user.sub },
        data: { status: "ONLINE" as any },
      });

      return updated;
    });

    this.logger.log(`Ride ${id} → COMPLETED`);
    return result;
  }
}
