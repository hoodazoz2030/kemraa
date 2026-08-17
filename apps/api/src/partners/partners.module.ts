import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PartnersController } from "./partners.controller.js";
import { SettlementsController } from "./settlements.controller.js";
import { PartnersService } from "./partners.service.js";

@Module({
  imports: [AuthModule],
  controllers: [PartnersController, SettlementsController],
  providers: [PartnersService],
})
export class PartnersModule {}
