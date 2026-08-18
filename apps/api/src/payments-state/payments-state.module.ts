import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PaymentsStateController } from "./payments-state.controller.js";
import { PaymentStateService } from "./payments-state.service.js";

@Module({
  imports: [AuthModule],
  controllers: [PaymentsStateController],
  providers: [PaymentStateService],
  exports: [PaymentStateService],
})
export class PaymentsStateModule {}
