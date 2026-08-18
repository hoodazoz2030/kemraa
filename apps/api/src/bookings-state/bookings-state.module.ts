import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { BookingsStateController } from "./bookings-state.controller.js";
import { BookingStateService } from "./bookings-state.service.js";

@Module({
  imports: [AuthModule],
  controllers: [BookingsStateController],
  providers: [BookingStateService],
  exports: [BookingStateService],
})
export class BookingsStateModule {}
