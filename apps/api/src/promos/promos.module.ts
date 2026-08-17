import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PromosController } from "./promos.controller.js";
import { PromosService } from "./promos.service.js";

@Module({
  imports: [AuthModule],
  controllers: [PromosController],
  providers: [PromosService],
  exports: [PromosService],
})
export class PromosModule {}
