import { Body, Controller, Get, Param, Post, UseGuards, ParseUUIDPipe, Req, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { SigningService } from "./signing.service.js";

@ApiTags("signing")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("signing")
export class SigningController {
  constructor(private readonly svc: SigningService) {}

  @Get("stats")
  stats() { return this.svc.stats(); }

  @Get("partners/:partnerId")
  listByPartner(@Param("partnerId", new ParseUUIDPipe()) partnerId: string) {
    return this.svc.listByPartner(partnerId);
  }

  @Post("request")
  @Roles("SUPER_ADMIN", "ADMIN")
  @Audit("signing.request.create", "signing")
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() b: { partnerId: string; signerEmail: string; signerName?: string; signerTitle?: string }) {
    return this.svc.createSigningRequest(b);
  }

  @Post(":id/send")
  @Roles("SUPER_ADMIN", "ADMIN")
  @Audit("signing.request.send", "signing")
  async send(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.svc.sendSigningRequest(id);
  }

  @Post(":id/cancel")
  @Roles("SUPER_ADMIN", "ADMIN")
  @Audit("signing.request.cancel", "signing")
  async cancel(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.svc.cancelRequest(id);
  }
}
