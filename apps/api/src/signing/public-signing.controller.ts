import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SigningService } from "./signing.service.js";

@ApiTags("signing-public")
@Controller("sign")
export class PublicSigningController {
  constructor(private readonly svc: SigningService) {}

  @Get(":token")
  async viewContract(@Param("token") token: string, @Req() req: any) {
    const ip = req.headers["x-forwarded-for"] || req.ip || "unknown";
    const ua = req.headers["user-agent"] || "unknown";
    return this.svc.markViewed(token, ip, ua);
  }

  @Post(":token/sign")
  async sign(
    @Param("token") token: string,
    @Body() b: { signerName: string; signatureData: any; fingerprint?: string },
    @Req() req: any,
  ) {
    const ip = req.headers["x-forwarded-for"] || req.ip || "unknown";
    const ua = req.headers["user-agent"] || "unknown";
    return this.svc.completeSigning(token, {
      signerName: b.signerName,
      signatureData: b.signatureData,
      ip,
      userAgent: ua,
      fingerprint: b.fingerprint,
    });
  }
}
