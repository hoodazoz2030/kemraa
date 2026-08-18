import { Body, Controller, Post, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PartnerPortalService } from "./partner-portal.service.js";

@ApiTags("partner-portal-auth")
@Controller("partner-portal")
export class PartnerAuthController {
  constructor(private readonly svc: PartnerPortalService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() b: { email: string; password: string; deviceFingerprint?: string }) {
    return this.svc.login(b.email, b.password, b.deviceFingerprint);
  }
}
