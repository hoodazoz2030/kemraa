import { Controller, Get, Post, Body, Param, Query, Req, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { BookingsService } from "./bookings.service.js";
import { CreateBookingDto, SubmitPaymentDto, ConfirmBookingDto, CreateReviewDto, ListBookingsQueryDto } from "./dto/bookings.dto.js";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Request } from "express";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "AGENCY_ADMIN", "PARTNER_ADMIN", "OPERATIONS"];

@ApiTags("bookings")
@ApiBearerAuth()
@Controller("bookings")
@UseGuards(RolesGuard)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post() @ApiOperation({ summary: "Create booking (DRAFT) with idempotency" })
  create(@Req() req: Request, @Body() dto: CreateBookingDto) {
    return this.bookings.create((req as any).user.sub, dto);
  }

  @Get() @ApiOperation({ summary: "List bookings (mine for customer, all for admin)" })
  list(@Req() req: Request, @Query() query: ListBookingsQueryDto) {
    const roles: string[] = (req as any).user?.roles ?? [];
    const isAdmin = roles.some((r) => ADMIN_ROLES.includes(r));
    return this.bookings.list((req as any).user.sub, isAdmin, query);
  }

  @Get(":id") @ApiOperation({ summary: "Get booking detail with items, payments, commissions" })
  getOne(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string) {
    const roles: string[] = (req as any).user?.roles ?? [];
    const isAdmin = roles.some((r) => ADMIN_ROLES.includes(r));
    return this.bookings.getOne((req as any).user.sub, isAdmin, id);
  }

  @Post(":id/submit") @HttpCode(HttpStatus.OK) @ApiOperation({ summary: "DRAFT -> PENDING_APPROVAL" })
  submit(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string) {
    return this.bookings.submitForApproval((req as any).user.sub, id);
  }

  @Post(":id/approve") @Roles(...ADMIN_ROLES) @HttpCode(HttpStatus.OK) @ApiOperation({ summary: "PENDING_APPROVAL -> PAYMENT_PENDING (admin)" })
  approve(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string) {
    return this.bookings.approve((req as any).user.sub, id);
  }

  @Post(":id/reject") @Roles(...ADMIN_ROLES) @HttpCode(HttpStatus.OK) @ApiOperation({ summary: "PENDING_APPROVAL -> REJECTED (admin)" })
  reject(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string, @Body("reason") reason: string) {
    return this.bookings.reject((req as any).user.sub, id, reason ?? "");
  }

  @Post(":id/payment") @HttpCode(HttpStatus.OK) @ApiOperation({ summary: "PAYMENT_PENDING -> CONFIRMING (submit payment)" })
  submitPayment(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string, @Body() dto: SubmitPaymentDto) {
    return this.bookings.submitPayment((req as any).user.sub, id, dto);
  }

  @Post(":id/confirm") @Roles(...ADMIN_ROLES) @HttpCode(HttpStatus.OK) @ApiOperation({ summary: "CONFIRMING -> CONFIRMED (admin/provider)" })
  confirm(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string, @Body() dto: ConfirmBookingDto) {
    return this.bookings.confirm((req as any).user.sub, id, dto);
  }

  @Post(":id/complete") @HttpCode(HttpStatus.OK) @ApiOperation({ summary: "CONFIRMED -> COMPLETED" })
  complete(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string) {
    return this.bookings.complete((req as any).user.sub, id);
  }

  @Post(":id/cancel") @HttpCode(HttpStatus.OK) @ApiOperation({ summary: "Request cancellation" })
  cancel(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string) {
    return this.bookings.cancel((req as any).user.sub, id);
  }

  @Post(":id/review") @HttpCode(HttpStatus.OK) @ApiOperation({ summary: "Add review after COMPLETED" })
  addReview(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string, @Body() dto: CreateReviewDto) {
    return this.bookings.addReview((req as any).user.sub, id, dto);
  }
}