import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PartnerAuthController } from "./partner-auth.controller.js";
import { PartnerKYBController } from "./partner-kyb.controller.js";
import { PartnerProfileController } from "./partner-profile.controller.js";
import { PartnerServicesController } from "./partner-services.controller.js";

@Module({
  imports: [AuthModule],
  controllers: [
    PartnerAuthController,
    PartnerKYBController,
    PartnerProfileController,
    PartnerServicesController,
  ],
})
export class PartnerModule {}
