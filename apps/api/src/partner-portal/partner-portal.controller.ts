import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PartnerGuard } from "../common/guards/partner.guard.js";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { PartnerPortalService } from "./partner-portal.service.js";

@ApiTags("partner-portal")
@Controller("partner-portal")
export class PartnerPortalController {
  constructor(private readonly svc: PartnerPortalService) {}

  // ========== Public: login (no guard) ==========
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() b: { email: string; password: string; deviceFingerprint?: string }) {
    return this.svc.login(b.email, b.password, b.deviceFingerprint);
  }

  // ========== Admin-only: create portal user ==========
  @Post("admin/create-user")
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "ADMIN")
  @HttpCode(HttpStatus.CREATED)
  async adminCreatePortalUser(
    @Body() b: { partnerId: string; email: string; password: string; firstName?: string; lastName?: string },
  ) {
    return this.svc.createPartnerUser(b);
  }

  // ========== Partner-only endpoints (PartnerGuard) ==========
  @Get("me")
  @ApiBearerAuth()
  @UseGuards(PartnerGuard)
  me(@Req() req: any) {
    return this.svc.getMe(req.partnerUser.partnerId, req.partnerUser.userId);
  }

  @Get("dashboard")
  @ApiBearerAuth()
  @UseGuards(PartnerGuard)
  dashboard(@Req() req: any) {
    return this.svc.getDashboard(req.partnerUser.partnerId);
  }

  @Get("bookings")
  @ApiBearerAuth()
  @UseGuards(PartnerGuard)
  bookings(@Req() req: any, @Query() q: any) {
    return this.svc.listBookings(req.partnerUser.partnerId, q);
  }

  @Get("drivers")
  @ApiBearerAuth()
  @UseGuards(PartnerGuard)
  drivers(@Req() req: any) {
    return this.svc.listDrivers(req.partnerUser.partnerId);
  }

  @Get("vehicles")
  @ApiBearerAuth()
  @UseGuards(PartnerGuard)
  vehicles(@Req() req: any) {
    return this.svc.listVehicles(req.partnerUser.partnerId);
  }

  @Get("settlements")
  @ApiBearerAuth()
  @UseGuards(PartnerGuard)
  settlements(@Req() req: any) {
    return this.svc.listSettlements(req.partnerUser.partnerId);
  }

  @Get("documents")
  @ApiBearerAuth()
  @UseGuards(PartnerGuard)
  documents(@Req() req: any) {
    return this.svc.listDocuments(req.partnerUser.partnerId);
  }

  @Post("documents")
  @ApiBearerAuth()
  @UseGuards(PartnerGuard)
  @HttpCode(HttpStatus.CREATED)
  uploadDocument(@Req() req: any, @Body() b: any) {
    return this.svc.uploadDocument(req.partnerUser.partnerId, {
      ...b,
      uploadedBy: req.partnerUser.userId,
    });
  }

  @Delete("documents/:id")
  @ApiBearerAuth()
  @UseGuards(PartnerGuard)
  deleteDocument(@Req() req: any, @Param("id", new ParseUUIDPipe()) id: string) {
    return this.svc.deleteDocument(req.partnerUser.partnerId, id);
  }
}
