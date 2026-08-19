import { Controller, Get, Post, Body, UseGuards, Req, Param, Query, SetMetadata, Logger } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §18 — Driver ride inbox + accept/decline workflow.
 * Ride states: REQUESTED → MATCHING → DRIVER_ASSIGNED → DRIVER_ARRIVING → DRIVER_ARRIVED → IN_PROGRESS → COMPLETED
 * RideEvent fields: type (String), payload (Json), occurredAt (DateTime)
 */
@ApiTags("driver-rides")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("driver-rides")
export class DriverRidesController {
  private readonly logger = new Logger(DriverRidesController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Available rides for driver to accept (REQUESTED or MATCHING without assigned driver).
   */
  @Get("available")
  @SetMetadata("roles", ["DRIVER"])
  async available(@Req() req: any, @Query() q: any) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: req.user.sub } });
    if (!driver) return { error: { code: "DRIVER_NOT_FOUND" } };

    if (driver.status !== "ONLINE" && driver.status !== "BUSY") {
      return { error: { code: "NOT_ONLINE", message: "Go online first to see rides" } };
    }

    const where: any = {
      status: { in: ["REQUESTED", "MATCHING"] as any },
      driverId: null,
    };

    const rides = await this.prisma.ride.findMany({
      where,
      include: {
        trip: { select: { id: true, title: true } },
      },
      take: Math.min(Number(q.limit) || 20, 50),
    });

    return { items: rides, total: rides.length };
  }

  /**
   * Driver's assigned/current rides.
   */
  @Get()
  @SetMetadata("roles", ["DRIVER"])
  async list(@Req() req: any, @Query() q: any) {
    const where: any = { driverId: req.user.sub };
    if (q.status) where.status = q.status;

    const rides = await this.prisma.ride.findMany({
      where,
      include: {
        trip: { select: { id: true, title: true } },
        events: { take: 5 },
      },
      take: 50,
    });
    return { items: rides, total: rides.length };
  }

  @Get(":id")
  @SetMetadata("roles", ["DRIVER"])
  async get(@Req() req: any, @Param("id") id: string) {
    const ride = await this.prisma.ride.findFirst({
      where: { id },
      include: {
        trip: true,
        events: { take: 10 },
      },
    });
    if (!ride) return { error: { code: "NOT_FOUND" } };

    const isAssigned = ride.driverId === req.user.sub;
    const isAvailable = ["REQUESTED", "MATCHING"].includes(ride.status) && !ride.driverId;
    if (!isAssigned && !isAvailable) {
      return { error: { code: "FORBIDDEN" } };
    }

    return ride;
  }

  /**
   * Accept a ride: REQUESTED/MATCHING → DRIVER_ASSIGNED.
   * Driver status: ONLINE → BUSY.
   */
  @Post(":id/accept")
  @SetMetadata("roles", ["DRIVER"])
  @Audit("driver.ride.accept", "ride")
  async accept(@Req() req: any, @Param("id") id: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: req.user.sub } });
    if (!driver) return { error: { code: "DRIVER_NOT_FOUND" } };
    if (driver.status === "BUSY") return { error: { code: "ALREADY_BUSY" } };
    if (driver.status !== "ONLINE") return { error: { code: "NOT_ONLINE" } };
    if (!["VERIFIED", "PENDING"].includes(driver.verificationStatus)) {
      return { error: { code: "NOT_VERIFIED", message: `Verification status: ${driver.verificationStatus}` } };
    }

    const ride = await this.prisma.ride.findUnique({ where: { id } });
    if (!ride) return { error: { code: "NOT_FOUND" } };
    if (ride.driverId) return { error: { code: "ALREADY_ASSIGNED" } };
    if (!["REQUESTED", "MATCHING"].includes(ride.status)) {
      return { error: { code: "INVALID_STATE", message: `Ride is ${ride.status}` } };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ride.update({
        where: { id },
        data: {
          driverId: req.user.sub,
          status: "DRIVER_ASSIGNED" as any,
        },
      });

      await tx.rideEvent.create({
        data: {
          rideId: id,
          type: "DRIVER_ASSIGNED",
          payload: {
            actorId: req.user.sub,
            actorType: "DRIVER",
            driverId: req.user.sub,
          } as any,
        },
      });

      await tx.driver.update({
        where: { userId: req.user.sub },
        data: { status: "BUSY" as any },
      });

      return updated;
    });

    this.logger.log(`Ride ${id} accepted by driver ${req.user.sub}`);
    return result;
  }

  /**
   * Decline a ride (removes driver from consideration).
   * Ride stays in REQUESTED/MATCHING for other drivers.
   */
  @Post(":id/decline")
  @SetMetadata("roles", ["DRIVER"])
  @Audit("driver.ride.decline", "ride")
  async decline(@Req() req: any, @Param("id") id: string, @Body() body: { reason?: string } = {}) {
    const ride = await this.prisma.ride.findUnique({ where: { id } });
    if (!ride) return { error: { code: "NOT_FOUND" } };
    if (ride.driverId === req.user.sub && ride.status === "DRIVER_ASSIGNED") {
      return { error: { code: "ALREADY_ASSIGNED", message: "Use cancel instead" } };
    }

    await this.prisma.rideEvent.create({
      data: {
        rideId: id,
        type: "DRIVER_DECLINED",
        payload: {
          actorId: req.user.sub,
          actorType: "DRIVER",
          reason: body.reason ?? null,
        } as any,
      },
    });

    this.logger.log(`Ride ${id} declined by driver ${req.user.sub}`);
    return { success: true, rideId: id };
  }

  /**
   * Cancel an assigned ride (driver backs out).
   * DRIVER_ASSIGNED → MATCHING (back to pool).
   * Driver status: BUSY → ONLINE.
   */
  @Post(":id/cancel")
  @SetMetadata("roles", ["DRIVER"])
  @Audit("driver.ride.cancel", "ride")
  async cancel(@Req() req: any, @Param("id") id: string, @Body() body: { reason?: string } = {}) {
    const ride = await this.prisma.ride.findFirst({
      where: { id, driverId: req.user.sub },
    });
    if (!ride) return { error: { code: "NOT_FOUND" } };
    if (ride.status !== "DRIVER_ASSIGNED" && ride.status !== "DRIVER_ARRIVING") {
      return { error: { code: "INVALID_STATE", message: `Cannot cancel in ${ride.status}` } };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ride.update({
        where: { id },
        data: {
          driverId: null,
          status: "MATCHING" as any,
        },
      });

      await tx.rideEvent.create({
        data: {
          rideId: id,
          type: "DRIVER_CANCELLED",
          payload: {
            actorId: req.user.sub,
            actorType: "DRIVER",
            reason: body.reason ?? null,
          } as any,
        },
      });

      await tx.driver.update({
        where: { userId: req.user.sub },
        data: { status: "ONLINE" as any },
      });

      return updated;
    });

    this.logger.log(`Ride ${id} cancelled by driver ${req.user.sub}`);
    return result;
  }
}
