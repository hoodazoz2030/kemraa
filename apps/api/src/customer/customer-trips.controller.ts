import { Controller, Get, Post, Body, UseGuards, Req, Param, Query, SetMetadata } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §12 — Customer-facing Trip endpoints.
 * Route prefix: /customer-trips (NOT /trips — that path is used by admin TripsController).
 */
@ApiTags("customer-trips")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("customer-trips")
export class CustomerTripsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @SetMetadata("roles", ["CUSTOMER"])
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
  @SetMetadata("roles", ["CUSTOMER"])
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
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("trip.create", "trip")
  async create(@Req() req: any, @Body() body: { title: string; destinationCountry: string; startAt: string; endAt: string; budgetMinor: number; currency?: string }) {
    return await this.prisma.trip.create({
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
  }

  /**
   * Customer "approve" means: confirm draft → mark ready for planning.
   * Distinct from admin approve (READY → ACTIVE).
   */
  @Post(":id/approve")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("trip.customer_approve", "trip")
  async approve(@Req() req: any, @Param("id") id: string) {
    try {
    const trip = await this.prisma.trip.findFirst({ where: { id, travelerId: req.user.sub } });
    if (!trip) return { error: { code: "NOT_FOUND", message: "Trip not found" } };
    if (trip.status !== "DRAFT") return { error: { code: "INVALID_STATE", message: "Trip must be DRAFT" } };
      return await this.prisma.trip.update({
        where: { id },
        data: { status: "APPROVED" as any },
      });
    } catch (err: any) {
      console.error("[approve] error:", err);
      return { error: { code: "INTERNAL", message: err?.message || "Approve failed" } };
    }
  }}
