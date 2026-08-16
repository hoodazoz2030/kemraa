import { Module } from "@nestjs/common";
import { ResendService } from "../auth/resend.service.js";

@Module({
  providers: [ResendService],
  exports: [ResendService],
})
export class EmailModule {}
