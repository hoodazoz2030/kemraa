import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PartnerAuthController } from "./partner-auth.controller.js";
import { PartnerKYBController } from "./partner-kyb.controller.js";
import { PartnerProfileController } from "./partner-profile.controller.js";

@Module({
  imports: [AuthModule],
  controllers: [PartnerAuthController, PartnerKYBController, PartnerProfileController],
})
export class PartnerModule {}
