import { Controller, Get, Post, Body, UseGuards, Req, Param, Query, SetMetadata, Logger } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

@ApiTags("customer-bookings")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("customer-bookings")
export class CustomerBookingsController {
  private readonly logger = new Logger(CustomerBookingsController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @SetMetadata("roles", ["CUSTOMER"])
  async list(@Req() req: any, @Query() q: any) {
    const where: any = { travelerId: req.user.sub };
    if (q.status) where.status = q.status;
    const items = await this.prisma.booking.findMany({
      where,
      include: { service: { select: { id: true, title: true, type: true } }, trip: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { items, total: await this.prisma.booking.count({ where }) };
  }

  @Get(":id")
  @SetMetadata("roles", ["CUSTOMER"])
  async get(@Req() req: any, @Param("id") id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, travelerId: req.user.sub },
      include: { service: true, trip: true, payments: { orderBy: { createdAt: "desc" } }, stateHistory: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
    if (!booking) return { error: { code: "NOT_FOUND", message: "Booking not found" } };
    return booking;
  }

  @Post()
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("booking.create", "booking")
  async create(@Req() req: any, @Body() body: { serviceId: string; tripId?: string; items?: any[]; totalMinor: number; currency?: string }) {
    try {
      const service = await this.prisma.service.findUnique({ where: { id: body.serviceId } });
      if (!service) return { error: { code: "SERVICE_NOT_FOUND" } };

      if (body.tripId) {
        const trip = await this.prisma.trip.findFirst({ where: { id: body.tripId, travelerId: req.user.sub } });
        if (!trip) return { error: { code: "TRIP_NOT_FOUND" } };
      }

      // Build minimal booking data with only REQUIRED fields + safe optionals
      const data: any = {
        travelerId: req.user.sub,
        serviceId: body.serviceId,
        status: "DRAFT" as any,
        totalMinor: body.totalMinor,
        currency: body.currency || "EGP",
        idempotencyKey: `cust_bk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      };

      // Add optional fields only if they exist in the request
      if (body.tripId) data.tripId = body.tripId;
      if (body.items) data.items = body.items;

      this.logger.log(`Creating booking with data keys: ${Object.keys(data).join(", ")}`);

      const booking = await this.prisma.booking.create({ data });
      return booking;
    } catch (err: any) {
      this.logger.error(`Booking create failed: ${err.message}`, err.stack);
      return { error: { code: "CREATE_FAILED", message: err.message, details: err.meta } };
    }
  }

  @Post(":id/submit")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("booking.submit", "booking")
  async submit(@Req() req: any, @Param("id") id: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id, travelerId: req.user.sub } });
    if (!booking) return { error: { code: "NOT_FOUND" } };
    if (booking.status !== "DRAFT") return { error: { code: "INVALID_STATE" } };
    return await this.prisma.booking.update({ where: { id }, data: { status: "PENDING_APPROVAL" as any } });
  }

  @Post(":id/cancel")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("booking.cancel", "booking")
  async cancel(@Req() req: any, @Param("id") id: string, @Body() body: { reason?: string }) {
    try {
      const booking = await this.prisma.booking.findFirst({ where: { id, travelerId: req.user.sub } });
      if (!booking) return { error: { code: "NOT_FOUND" } };
      if (!["DRAFT", "PENDING_APPROVAL"].includes(booking.status)) {
        return { error: { code: "INVALID_STATE", message: "Only DRAFT or PENDING_APPROVAL can be cancelled" } };
      }

      return await this.prisma.booking.update({
        where: { id },
        data: { status: "CANCELLED" as any },
      });
    } catch (err: any) {
      this.logger.error(`Cancel failed: ${err.message}`);
      return { error: { code: "CANCEL_FAILED", message: err.message } };
    }
  }
}