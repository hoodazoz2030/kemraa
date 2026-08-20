import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";
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
import { PartnerFinanceController } from "./partner-finance.controller.js";
import { PartnerContractsController } from "./partner-contracts.controller.js";
import { PartnerReportsController } from "./partner-reports.controller.js";
import { PartnerDriversController } from "./partner-drivers.controller.js";
import { PartnerVehiclesController } from "./partner-vehicles.controller.js";
import { PartnerRidesController } from "./partner-rides.controller.js";
import { PartnerWebhooksController } from "./partner-webhooks.controller.js";
import { PartnerSecurityController } from "./partner-security.controller.js";

@Module({
  imports: [
    AuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "test-secret-key-12345-for-testing-only-min-32-chars",
      signOptions: { expiresIn: "7d" },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
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
    PartnerFinanceController,
    PartnerContractsController,
    PartnerReportsController,
    PartnerDriversController,
    PartnerVehiclesController,
    PartnerRidesController,
    PartnerWebhooksController,
    PartnerSecurityController,
  ],
})
export class PartnerModule {}
