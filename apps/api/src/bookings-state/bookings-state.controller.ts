import { Body, Controller, Get, Param, Post, Query, Req, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from "@nestjs/common";
import { BookingTransitionDto } from "./dto/booking.dto.js";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { BookingStateService, BOOKING_TRANSITIONS } from "./bookings-state.service.js";

@ApiTags("bookings-state")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("admin/bookings-state")
export class BookingsStateController {
  constructor(private readonly svc: BookingStateService) {}

  @Get("machine")
  getMachine() { return BOOKING_TRANSITIONS; }

  @Get("stats")
  @Roles("SUPER_ADMIN", "ADMIN", "OPERATIONS", "SUPPORT")
  stats() { return this.svc.stats(); }

  @Get(":id")
  @Roles("SUPER_ADMIN", "ADMIN", "OPERATIONS", "SUPPORT")
  detail(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.svc.getDetailWithHistory(id);
  }

  @Get(":id/history")
  @Roles("SUPER_ADMIN", "ADMIN", "OPERATIONS", "SUPPORT")
  history(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.svc.getHistory(id);
  }

  @Post(":id/transition")
  @Roles("SUPER_ADMIN", "ADMIN", "OPERATIONS", "SUPPORT")
  @Audit("booking.state.transition", "booking")
  @HttpCode(HttpStatus.OK)
  transition(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() b: BookingTransitionDto,
    @Req() req: any,
  ) {
    return this.svc.transition(id, b.toStatus, {
      actorId: req.user?.sub ?? req.user?.userId,
      actorType: "STAFF",
      actorRole: req.user?.roles?.[0] ?? "ADMIN",
      reason: b.reason,
      metadata: b.metadata,
      ip: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    });
  }
}
