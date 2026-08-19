import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CustomerAuthController } from "./customer-auth.controller.js";
import { CustomerProfileController } from "./customer-profile.controller.js";
import { CustomerTripsController } from "./customer-trips.controller.js";
import { CustomerServicesController } from "./customer-services.controller.js";
import { CustomerBookingsController } from "./customer-bookings.controller.js";
import { CustomerPaymentsController } from "./customer-payments.controller.js";

@Module({
  imports: [AuthModule],
  controllers: [
    CustomerAuthController,
    CustomerProfileController,
    CustomerTripsController,
    CustomerServicesController,
    CustomerBookingsController,
    CustomerPaymentsController,
  ],
})
export class CustomerModule {}
