import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DriverAuthController } from "./driver-auth.controller.js";
import { DriverProfileController } from "./driver-profile.controller.js";
import { DriverVehiclesController } from "./driver-vehicles.controller.js";

@Module({
  imports: [AuthModule],
  controllers: [
    DriverAuthController,
    DriverProfileController,
    DriverVehiclesController,
  ],
})
export class DriverModule {}
