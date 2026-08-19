import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DriverAuthController } from "./driver-auth.controller.js";
import { DriverProfileController } from "./driver-profile.controller.js";
import { DriverVehiclesController } from "./driver-vehicles.controller.js";
import { DriverRidesController } from "./driver-rides.controller.js";
import { DriverRidesStateController } from "./driver-rides-state.controller.js";
import { DriverLocationController } from "./driver-location.controller.js";

@Module({
  imports: [AuthModule],
  controllers: [
    DriverAuthController,
    DriverProfileController,
    DriverVehiclesController,
    DriverRidesController,
    DriverRidesStateController,
    DriverLocationController,
  ],
})
export class DriverModule {}
