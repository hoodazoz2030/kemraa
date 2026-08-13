import { Module } from "@nestjs/common";
import { ServicesController } from "./services.controller.js";
import { ServicesService } from "./services.service.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [AuthModule],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}