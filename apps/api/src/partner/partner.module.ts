import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthModule } from "../auth/auth.module.js";
import { PartnerAuthController } from "./partner-auth.controller.js";
import { PartnerKYBController } from "./partner-kyb.controller.js";
import { PartnerProfileController } from "./partner-profile.controller.js";
import { PartnerServicesController } from "./partner-services.controller.js";
import { PartnerBookingsController } from "./partner-bookings.controller.js";
import { PartnerDashboardController } from "./partner-dashboard.controller.js";
import { PartnerReferralsController } from "./partner-referrals.controller.js";
import { PartnerTeamController } from "./partner-team.controller.js";
import { PartnerReviewsController } from "./partner-reviews.controller.js";
import { PartnerNotificationsController } from "./partner-notifications.controller.js";
import { PartnerSupportController } from "./partner-support.controller.js";
import { PartnerServicesOpsController, PartnerAnalyticsController } from "./partner-ops.controller.js";

@Module({
  imports: [
    AuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "test-secret-key-12345-for-testing-only-min-32-chars",
      signOptions: { expiresIn: "7d" },
    }),
  ],
  controllers: [
    PartnerAuthController,
    PartnerKYBController,
    PartnerProfileController,
    PartnerServicesController,
    PartnerBookingsController,
    PartnerDashboardController,
    PartnerReferralsController,
    PartnerTeamController,
    PartnerReviewsController,
    PartnerNotificationsController,
    PartnerSupportController,
    PartnerServicesOpsController,
    PartnerAnalyticsController,
  ],
})
export class PartnerModule {}
