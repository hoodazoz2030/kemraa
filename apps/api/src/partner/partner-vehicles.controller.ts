import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe, BadRequestException } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PartnerGuard } from "../common/guards/partner.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

const VEHICLE_STATUSES = ["ACTIVE", "INACTIVE", "MAINTENANCE"];

@ApiTags("partner-vehicles")
@ApiBearerAuth()
@UseGuards(PartnerGuard)
@Controller("partner-vehicles")
export class PartnerVehiclesController {
  constructor(private readonly prisma: PrismaService) {}

  private ensureWriteAccess(req: any) {
    if (!["PARTNER_ADMIN", "PARTNER_STAFF"].includes(req.partnerUser.role)) {
      throw new BadRequestException({ code: "FORBIDDEN" });
    }
  }

  private async ownVehicle(id: string, partnerId: string) {
    const v = await this.prisma.vehicle.findFirst({ where: { id, partnerId } });
    if (!v) throw new BadRequestException({ code: "NOT_FOUND" });
    return v;
  }

  @Get()
  async list(@Req() req: any) {
    const items = await this.prisma.vehicle.findMany({
      where: { partnerId: req.partnerUser.partnerId },
      include: { driver: { include: { user: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } } } } },
      orderBy: { plateRef: "asc" },
    });
    return { items };
  }

  @Get(":id")
  async detail(@Req() req: any, @Param("id", new ParseUUIDPipe()) id: string) {
    const v = await this.ownVehicle(id, req.partnerUser.partnerId);
    return this.prisma.vehicle.findUnique({ where: { id: v.id }, include: { driver: true } });
  }

  @Post()
  @Audit("partner.vehicle_create", "vehicle")
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() b: { plateRef: string; make: string; model: string; year: number; capacity: number; driverId?: string }) {
    this.ensureWriteAccess(req);
    if (b.driverId) {
      const driver = await this.prisma.driver.findFirst({ where: { userId: b.driverId, partnerId: req.partnerUser.partnerId } });
      if (!driver) throw new BadRequestException({ code: "DRIVER_NOT_FOUND" });
    }
    const existing = await this.prisma.vehicle.findFirst({ where: { plateRef: b.plateRef, partnerId: req.partnerUser.partnerId } });
    if (existing) throw new BadRequestException({ code: "PLATE_EXISTS" });

    const v = await this.prisma.vehicle.create({
      data: {
        plateRef: b.plateRef, make: b.make, model: b.model, year: b.year, capacity: b.capacity,
        partnerId: req.partnerUser.partnerId, driverId: b.driverId,
      },
    });
    return v;
  }

  @Patch(":id")
  @Audit("partner.vehicle_update", "vehicle")
  async update(@Req() req: any, @Param("id", new ParseUUIDPipe()) id: string, @Body() b: any) {
    this.ensureWriteAccess(req);
    const v = await this.ownVehicle(id, req.partnerUser.partnerId);
    const data: any = {};
    if (b.plateRef) data.plateRef = b.plateRef;
    if (b.make) data.make = b.make;
    if (b.model) data.model = b.model;
    if (b.year) data.year = b.year;
    if (b.capacity) data.capacity = b.capacity;
    if (b.status && VEHICLE_STATUSES.includes(b.status)) data.status = b.status;
    if (b.driverId !== undefined) {
      if (b.driverId === null) data.driverId = null;
      else {
        const driver = await this.prisma.driver.findFirst({ where: { userId: b.driverId, partnerId: req.partnerUser.partnerId } });
        if (!driver) throw new BadRequestException({ code: "DRIVER_NOT_FOUND" });
        data.driverId = b.driverId;
      }
    }
    return this.prisma.vehicle.update({ where: { id: v.id }, data });
  }

  @Post(":id/assign-driver")
  @Audit("partner.vehicle_assign_driver", "vehicle")
  async assignDriver(@Req() req: any, @Param("id", new ParseUUIDPipe()) id: string, @Body() b: { driverId: string }) {
    this.ensureWriteAccess(req);
    const v = await this.ownVehicle(id, req.partnerUser.partnerId);
    const driver = await this.prisma.driver.findFirst({ where: { userId: b.driverId, partnerId: req.partnerUser.partnerId } });
    if (!driver) throw new BadRequestException({ code: "DRIVER_NOT_FOUND" });
    return this.prisma.vehicle.update({ where: { id: v.id }, data: { driverId: b.driverId } });
  }

  @Delete(":id")
  @Audit("partner.vehicle_delete", "vehicle")
  async remove(@Req() req: any, @Param("id", new ParseUUIDPipe()) id: string) {
    this.ensureWriteAccess(req);
    const v = await this.ownVehicle(id, req.partnerUser.partnerId);
    await this.prisma.vehicle.delete({ where: { id: v.id } });
    return { ok: true };
  }
}
