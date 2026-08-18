import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PartnerGuard } from "../common/guards/partner.guard.js";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { PartnerPortalService } from "./partner-portal.service.js";

@ApiTags("partner-portal")
@ApiBearerAuth()
@UseGuards(PartnerGuard)
@Controller("partner-portal")
export class PartnerPortalController {
  constructor(private readonly svc: PartnerPortalService) {}

  @Get("me")
  me(@Req() req: any) {
    return this.svc.getMe(req.partnerUser.partnerId, req.partnerUser.userId);
  }

  @Get("dashboard")
  dashboard(@Req() req: any) {
    return this.svc.getDashboard(req.partnerUser.partnerId);
  }

  @Get("bookings")
  bookings(@Req() req: any, @Query() q: any) {
    return this.svc.listBookings(req.partnerUser.partnerId, q);
  }

  @Get("drivers")
  drivers(@Req() req: any) {
    return this.svc.listDrivers(req.partnerUser.partnerId);
  }

  @Get("vehicles")
  vehicles(@Req() req: any) {
    return this.svc.listVehicles(req.partnerUser.partnerId);
  }

  @Get("settlements")
  settlements(@Req() req: any) {
    return this.svc.listSettlements(req.partnerUser.partnerId);
  }

  @Get("documents")
  documents(@Req() req: any) {
    return this.svc.listDocuments(req.partnerUser.partnerId);
  }

  @Post("documents")
  @HttpCode(HttpStatus.CREATED)
  uploadDocument(@Req() req: any, @Body() b: any) {
    return this.svc.uploadDocument(req.partnerUser.partnerId, {
      ...b,
      uploadedBy: req.partnerUser.userId,
    });
  }

  @Delete("documents/:id")
  deleteDocument(@Req() req: any, @Param("id", new ParseUUIDPipe()) id: string) {
    return this.svc.deleteDocument(req.partnerUser.partnerId, id);
  }

  // ========== Admin-only: create portal user ==========
  @Post("admin/create-user")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "ADMIN")
  @HttpCode(HttpStatus.CREATED)
  async adminCreatePortalUser(
    @Body() b: { partnerId: string; email: string; password: string; firstName?: string; lastName?: string },
  ) {
    return this.svc.createPartnerUser(b);
  }
}
