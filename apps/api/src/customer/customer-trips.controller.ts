import { Controller, Get, Post, Body, UseGuards, Req, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

@ApiTags("customer-trips")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("trips")
export class CustomerTripsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles("CUSTOMER")
  async list(@Req() req: any, @Query() q: any) {
    const where: any = { travelerId: req.user.sub };
    if (q.status) where.status = q.status;
    const items = await this.prisma.trip.findMany({
      where,
      include: { itineraries: { orderBy: { version: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { items, total: await this.prisma.trip.count({ where }) };
  }

  @Get(":id")
  @Roles("CUSTOMER")
  async get(@Req() req: any, @Param("id") id: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id, travelerId: req.user.sub },
      include: {
        itineraries: { include: { items: true }, orderBy: { version: "desc" } },
        bookings: { include: { service: true } },
      },
    });
    if (!trip) return { error: { code: "NOT_FOUND", message: "Trip not found" } };
    return trip;
  }

  @Post()
  @Roles("CUSTOMER")
  @Audit("trip.create", "trip")
  async create(@Req() req: any, @Body() body: { title: string; destinationCountry: string; startAt: string; endAt: string; budgetMinor: number; currency?: string }) {
    const trip = await this.prisma.trip.create({
      data: {
        travelerId: req.user.sub,
        title: body.title,
        destinationCountry: body.destinationCountry,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
        budgetMinor: body.budgetMinor,
        currency: body.currency || "EGP",
        status: "DRAFT" as any,
      },
    });
    return trip;
  }

  @Post(":id/approve")
  @Roles("CUSTOMER")
  @Audit("trip.approve", "trip")
  async approve(@Req() req: any, @Param("id") id: string) {
    const trip = await this.prisma.trip.findFirst({ where: { id, travelerId: req.user.sub } });
    if (!trip) return { error: { code: "NOT_FOUND", message: "Trip not found" } };
    if (trip.status !== "DRAFT") return { error: { code: "INVALID_STATE", message: "Trip must be DRAFT" } };

    const updated = await this.prisma.trip.update({
      where: { id },
      data: { status: "APPROVED" as any },
    });
    return updated;
  }
}