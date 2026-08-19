import { Controller, Get, Post, Patch, Delete, Body, UseGuards, Req, Param, SetMetadata, Logger } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §18 — Driver vehicle management.
 */
@ApiTags("driver-vehicles")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("driver-vehicles")
export class DriverVehiclesController {
  private readonly logger = new Logger(DriverVehiclesController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @SetMetadata("roles", ["DRIVER"])
  async list(@Req() req: any) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { driverId: req.user.sub },
      orderBy: { createdAt: "desc" } as any,
    });
    return { items: vehicles, total: vehicles.length };
  }

  @Get(":id")
  @SetMetadata("roles", ["DRIVER"])
  async get(@Req() req: any, @Param("id") id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, driverId: req.user.sub },
    });
    if (!vehicle) return { error: { code: "NOT_FOUND" } };
    return vehicle;
  }

  @Post()
  @SetMetadata("roles", ["DRIVER"])
  @Audit("driver.vehicle.create", "vehicle")
  async create(@Req() req: any, @Body() body: {
    plateRef: string;
    make: string;
    model: string;
    year: number;
    capacity: number;
  }) {
    try {
      const vehicle = await this.prisma.vehicle.create({
        data: {
          driverId: req.user.sub,
          plateRef: body.plateRef,
          make: body.make,
          model: body.model,
          year: body.year,
          capacity: body.capacity,
          status: "ACTIVE" as any,
        },
      });
      this.logger.log(`Vehicle created: ${vehicle.id}`);
      return vehicle;
    } catch (err: any) {
      if (err.code === "P2002") return { error: { code: "PLATE_EXISTS" } };
      return { error: { code: "CREATE_FAILED", message: err.message } };
    }
  }

  @Patch(":id")
  @SetMetadata("roles", ["DRIVER"])
  @Audit("driver.vehicle.update", "vehicle")
  async update(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    const existing = await this.prisma.vehicle.findFirst({ where: { id, driverId: req.user.sub } });
    if (!existing) return { error: { code: "NOT_FOUND" } };

    const data: any = {};
    for (const k of ["plateRef", "make", "model", "year", "capacity", "status"]) {
      if (body[k] !== undefined) data[k] = body[k];
    }

    return await this.prisma.vehicle.update({ where: { id }, data });
  }

  @Delete(":id")
  @SetMetadata("roles", ["DRIVER"])
  @Audit("driver.vehicle.delete", "vehicle")
  async delete(@Req() req: any, @Param("id") id: string) {
    const existing = await this.prisma.vehicle.findFirst({ where: { id, driverId: req.user.sub } });
    if (!existing) return { error: { code: "NOT_FOUND" } };
    await this.prisma.vehicle.delete({ where: { id } });
    return { success: true };
  }
}
