import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from "@nestjs/common";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { FeatureFlagGuard, RequireFlag } from "../common/guards/feature-flag.guard.js";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { TripsService } from "./trips.service.js";
import { CreateTripDto, UpdateTripDto, AddItineraryItemsDto, RejectTripDto, ListTripsQueryDto } from "./dto/trips.dto.js";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Request } from "express";

// Matches the actual Prisma Role enum (no AGENCY_OWNER/AGENCY_MANAGER)
const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "AGENCY_ADMIN", "PARTNER_ADMIN", "OPERATIONS"];

@ApiTags("trips")
@ApiBearerAuth()
@Controller("trips")
@UseGuards(RolesGuard)
export class TripsController {
  constructor(private readonly trips: TripsService) {}
  private isAdmin(req: Request) {
    const roles: string[] = (req as any).user?.roles ?? [];
    return roles.some((r) => ADMIN_ROLES.includes(r));
  }

  @Post()
  @UseGuards(FeatureFlagGuard)
  @RequireFlag("trips_enabled")
  @ApiOperation({ summary: "Create trip (DRAFT)" })
  @Audit("trip.create", "trip")
  create(@Req() req: Request, @Body() dto: CreateTripDto) {
    return this.trips.create((req as any).user.sub, dto);
  }

  @Get() @ApiOperation({ summary: "List trips" })
  list(@Req() req: Request, @Query() query: ListTripsQueryDto) {
    return this.trips.list((req as any).user.sub, this.isAdmin(req), query);
  }

  @Get(":id") @ApiOperation({ summary: "Get trip detail" })
  getOne(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string) {
    return this.trips.getOne((req as any).user.sub, this.isAdmin(req), id);
  }

  @Patch(":id") @ApiOperation({ summary: "Update DRAFT/PLANNING trip" })
  update(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string, @Body() dto: UpdateTripDto) {
    return this.trips.update((req as any).user.sub, id, dto);
  }

  @Post(":id/itinerary/items") @HttpCode(HttpStatus.OK) @ApiOperation({ summary: "Add items to current itinerary" })
  addItems(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string, @Body() dto: AddItineraryItemsDto) {
    return this.trips.addItineraryItems((req as any).user.sub, id, dto);
  }

  @Post(":id/itinerary/replace") @HttpCode(HttpStatus.OK) @ApiOperation({ summary: "Create new itinerary version" })
  replaceItinerary(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string, @Body() dto: AddItineraryItemsDto) {
    return this.trips.replaceItinerary((req as any).user.sub, id, dto);
  }

  @Post(":id/request") @HttpCode(HttpStatus.OK) @ApiOperation({ summary: "PLANNING -> READY" })
  request(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string) {
    return this.trips.requestApproval((req as any).user.sub, id);
  }

  @Post(":id/approve") @Roles(...ADMIN_ROLES) @HttpCode(HttpStatus.OK) @ApiOperation({ summary: "READY -> ACTIVE (admin only)" })
  approve(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string) {
    return this.trips.approve((req as any).user.sub, id);
  }

  @Post(":id/reject") @Roles(...ADMIN_ROLES) @HttpCode(HttpStatus.OK) @ApiOperation({ summary: "READY -> PLANNING (admin only)" })
  reject(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string, @Body() dto: RejectTripDto) {
    return this.trips.reject((req as any).user.sub, id, dto.reason);
  }
}