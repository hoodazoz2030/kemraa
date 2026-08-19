import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PartnerAuthController } from "./partner-auth.controller.js";
import { PartnerKYBController } from "./partner-kyb.controller.js";
import { PartnerProfileController } from "./partner-profile.controller.js";
import { PartnerServicesController } from "./partner-services.controller.js";
import { PartnerBookingsController } from "./partner-bookings.controller.js";
import { PartnerDashboardController } from "./partner-dashboard.controller.js";
import { PartnerReferralsController } from "./partner-referrals.controller.js";

@Module({
  imports: [AuthModule],
  controllers: [
    PartnerAuthController,
    PartnerKYBController,
    PartnerProfileController,
    PartnerServicesController,
    PartnerBookingsController,
    PartnerDashboardController,
    PartnerReferralsController,
  ],
})
export class PartnerModule {}
