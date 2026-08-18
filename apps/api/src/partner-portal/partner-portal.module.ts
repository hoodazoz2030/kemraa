import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { JwtModule } from "@nestjs/jwt";
import { PartnerPortalController } from "./partner-portal.controller.js";
import { PartnerAuthController } from "./partner-auth.controller.js";
import { PartnerPortalService } from "./partner-portal.service.js";

@Module({
  imports: [AuthModule, JwtModule.register({ secret: process.env.JWT_SECRET ?? "dev-secret", signOptions: { expiresIn: "7d" } })],
  controllers: [PartnerPortalController, PartnerAuthController],
  providers: [PartnerPortalService],
  exports: [PartnerPortalService],
})
export class PartnerPortalModule {}
