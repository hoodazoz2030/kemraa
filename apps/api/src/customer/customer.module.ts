import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CustomerAuthController } from "./customer-auth.controller.js";
import { CustomerProfileController } from "./customer-profile.controller.js";
import { CustomerTripsController } from "./customer-trips.controller.js";

@Module({
  imports: [AuthModule],
  controllers: [CustomerAuthController, CustomerProfileController, CustomerTripsController],
})
export class CustomerModule {}
