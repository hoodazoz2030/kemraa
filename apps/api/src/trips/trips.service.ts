import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { CreateTripDto, UpdateTripDto, AddItineraryItemsDto, ItineraryItemDto } from "./dto/trips.dto.js";
import { Prisma } from "@prisma/client";

const TRIP_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PLANNING", "CANCELLED"],
  PLANNING: ["READY", "CANCELLED"],
  READY: ["ACTIVE", "PLANNING", "CANCELLED"],
  ACTIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTripDto) {
    if (dto.startAt && dto.endAt) this.validateDates(dto.startAt, dto.endAt);
    return this.prisma.trip.create({
      data: {
        title: dto.title,
        destinationCountry: dto.destinationCountry ?? "EG",
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        currency: dto.currency ?? "EGP",
        budgetMinor: dto.budgetMinor ?? 0,
        status: "DRAFT",
        traveler: { connect: { id: userId } },
      },
    });
  }

  async list(userId: string, isAdmin: boolean, query: { status?: string; limit?: number; offset?: number }) {
    const where: any = {};
    if (!isAdmin) where.travelerId = userId;
    if (query.status) where.status = query.status;
    return this.prisma.trip.findMany({
      where, orderBy: { createdAt: "desc" },
      take: Math.min(query.limit ?? 50, 200), skip: query.offset ?? 0,
      include: { itineraries: { orderBy: { version: "desc" }, take: 1 } },
    });
  }

  async getOne(userId: string, isAdmin: boolean, tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { itineraries: { orderBy: { version: "desc" }, include: { items: { orderBy: { startAt: "asc" } } } } },
    });
    if (!trip) throw new NotFoundException({ code: "TRIP_NOT_FOUND" });
    if (!isAdmin && trip.travelerId !== userId) throw new ForbiddenException({ code: "FORBIDDEN" });
    return trip;
  }

  async update(userId: string, tripId: string, dto: UpdateTripDto) {
    const trip = await this.mustOwn(userId, tripId);
    if (!["DRAFT", "PLANNING"].includes(trip.status)) {
      throw new BadRequestException({ code: "TRIP_LOCKED" });
    }
    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.destinationCountry !== undefined) data.destinationCountry = dto.destinationCountry;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.budgetMinor !== undefined) data.budgetMinor = dto.budgetMinor;
    if (dto.startAt !== undefined) data.startAt = dto.startAt ? new Date(dto.startAt) : null;
    if (dto.endAt !== undefined) data.endAt = dto.endAt ? new Date(dto.endAt) : null;
    return this.prisma.trip.update({ where: { id: tripId }, data });
  }

  private async recalcAndReturn(itineraryId: string) {
    const it = await this.prisma.itinerary.findUnique({ where: { id: itineraryId }, include: { items: true } });
    if (!it) throw new NotFoundException({ code: "ITINERARY_NOT_FOUND" });
    const total = it.items.reduce((s, x) => s + (x.estimatedMinor ?? 0), 0);
    return this.prisma.itinerary.update({
      where: { id: itineraryId },
      data: { totalEstimatedMinor: total },
      include: { items: true },
    });
  }

  async addItineraryItems(userId: string, tripId: string, dto: AddItineraryItemsDto) {
    const trip = await this.mustOwn(userId, tripId);
    if (!["DRAFT", "PLANNING"].includes(trip.status)) {
      throw new BadRequestException({ code: "ITINERARY_LOCKED" });
    }
    if (trip.status === "DRAFT") {
      await this.prisma.trip.update({ where: { id: tripId }, data: { status: "PLANNING" } });
    }
    let itinerary = await this.prisma.itinerary.findFirst({ where: { tripId }, orderBy: { version: "desc" } });
    if (!itinerary) {
      itinerary = await this.prisma.itinerary.create({
        data: { tripId, version: 1, status: "DRAFT", items: { create: this.mapItems(dto.items) } },
      });
    } else {
      await this.prisma.itineraryItem.createMany({
        data: this.mapItems(dto.items).map((it: any) => ({ ...it, itineraryId: itinerary!.id })),
      });
    }
    return this.recalcAndReturn(itinerary.id);
  }

  async replaceItinerary(userId: string, tripId: string, dto: AddItineraryItemsDto) {
    const trip = await this.mustOwn(userId, tripId);
    if (!["DRAFT", "PLANNING"].includes(trip.status)) {
      throw new BadRequestException({ code: "ITINERARY_LOCKED" });
    }
    const latest = await this.prisma.itinerary.findFirst({ where: { tripId }, orderBy: { version: "desc" }, select: { version: true } });
    const newVersion = (latest?.version ?? 0) + 1;
    const itinerary = await this.prisma.itinerary.create({
      data: { tripId, version: newVersion, status: "DRAFT", items: { create: this.mapItems(dto.items) } },
    });
    return this.recalcAndReturn(itinerary.id);
  }

  async requestApproval(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { itineraries: { orderBy: { version: "desc" }, take: 1, include: { items: true } } },
    });
    if (!trip) throw new NotFoundException({ code: "TRIP_NOT_FOUND" });
    if (trip.travelerId !== userId) throw new ForbiddenException({ code: "FORBIDDEN" });
    this.assertTransition(trip.status, "READY");
    const it = trip.itineraries[0];
    if (!it || it.items.length === 0) {
      throw new BadRequestException({ code: "ITINERARY_REQUIRED" });
    }
    await this.prisma.$transaction([
      this.prisma.trip.update({ where: { id: tripId }, data: { status: "READY" } }),
      this.prisma.itinerary.update({ where: { id: it.id }, data: { status: "PROPOSED" } }),
    ]);
    return this.getOne(userId, false, tripId);
  }

  async approve(adminId: string, tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { itineraries: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!trip) throw new NotFoundException({ code: "TRIP_NOT_FOUND" });
    this.assertTransition(trip.status, "ACTIVE");
    const it = trip.itineraries[0];
    if (!it || it.status !== "PROPOSED") throw new BadRequestException({ code: "NO_PROPOSED_ITINERARY" });
    // Use function-based transaction to avoid overload issues
    await this.prisma.$transaction(async (tx) => {
      await tx.trip.update({ where: { id: tripId }, data: { status: "ACTIVE" } });
      await tx.itinerary.update({ where: { id: it.id }, data: { status: "APPROVED", approvedAt: new Date() } });
    });
    return this.getOne(trip.travelerId, true, tripId);
  }

  async reject(adminId: string, tripId: string, reason: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { itineraries: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!trip) throw new NotFoundException({ code: "TRIP_NOT_FOUND" });
    this.assertTransition(trip.status, "PLANNING");
    const it = trip.itineraries[0];
    await this.prisma.$transaction(async (tx) => {
      await tx.trip.update({ where: { id: tripId }, data: { status: "PLANNING" } });
      if (it) {
        await tx.itinerary.update({ where: { id: it.id }, data: { status: "DRAFT" } });
      }
    });
    return this.getOne(trip.travelerId, true, tripId);
  }

  private mapItems(items: ItineraryItemDto[]): any[] {
    return items.map((it) => ({
      type: it.type,
      title: it.title,
      startAt: it.startAt ? new Date(it.startAt) : null,
      endAt: it.endAt ? new Date(it.endAt) : null,
      location: (it.location ?? {}) as Prisma.InputJsonValue,
      estimatedMinor: it.estimatedMinor ?? 0,
    }));
  }

  private async mustOwn(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException({ code: "TRIP_NOT_FOUND" });
    if (trip.travelerId !== userId) throw new ForbiddenException({ code: "FORBIDDEN" });
    return trip;
  }

  private assertTransition(from: string, to: string) {
    if (!TRIP_TRANSITIONS[from]?.includes(to)) {
      throw new BadRequestException({ code: "INVALID_TRANSITION" });
    }
  }

  private validateDates(start: string, end: string) {
    const s = new Date(start); const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) throw new BadRequestException({ code: "INVALID_DATE_FORMAT" });
    if (e <= s) throw new BadRequestException({ code: "INVALID_END_DATE" });
  }
}