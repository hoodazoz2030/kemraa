import { Controller, Get, Post, Body, UseGuards, Req, Param, SetMetadata, Logger } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §18 — Driver incident reporting.
 */
@ApiTags("driver-incidents")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("driver-incidents")
export class DriverIncidentsController {
  private readonly logger = new Logger(DriverIncidentsController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @SetMetadata("roles", ["DRIVER"])
  async list(@Req() req: any) {
    // Incidents reported by this driver
    const items = await this.prisma.rideIncident.findMany({
      where: { reporterId: req.user.sub },
      include: { ride: { select: { id: true, status: true, fareMinor: true } } },
      take: 50,
    });
    return { items, total: items.length };
  }

  @Post()
  @SetMetadata("roles", ["DRIVER"])
  @Audit("driver.incident.report", "incident")
  async report(@Req() req: any, @Body() body: {
    rideId: string;
    category: string;
    description: string;
    severity?: string;
  }) {
    // Driver must be assigned to the ride or have completed it
    const ride = await this.prisma.ride.findFirst({
      where: { id: body.rideId, driverId: req.user.sub },
    });
    if (!ride) return { error: { code: "RIDE_NOT_FOUND" } };

    try {
      const incident = await this.prisma.rideIncident.create({
        data: {
          rideId: body.rideId,
          reporterId: req.user.sub,
          reporterType: "DRIVER",
          category: body.category,
          description: body.description,
          severity: body.severity || "MEDIUM",
          status: "OPEN",
        },
      });

      // Update ride status to INCIDENT
      await this.prisma.ride.update({
        where: { id: body.rideId },
        data: { status: "INCIDENT" as any },
      });

      await this.prisma.rideEvent.create({
        data: {
          rideId: body.rideId,
          type: "INCIDENT_REPORTED",
          payload: {
            actorId: req.user.sub,
            actorType: "DRIVER",
            incidentId: incident.id,
            category: body.category,
            severity: incident.severity,
          } as any,
        },
      });

      this.logger.log(`Incident reported on ride ${body.rideId}: ${incident.id}`);
      return incident;
    } catch (err: any) {
      return { error: { code: "CREATE_FAILED", message: err.message } };
    }
  }

  @Get(":id")
  @SetMetadata("roles", ["DRIVER"])
  async get(@Req() req: any, @Param("id") id: string) {
    const incident = await this.prisma.rideIncident.findFirst({
      where: { id, reporterId: req.user.sub },
      include: { ride: true },
    });
    if (!incident) return { error: { code: "NOT_FOUND" } };
    return incident;
  }
}
