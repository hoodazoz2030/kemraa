import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { IncidentsController } from "./incidents.controller.js";
import { IncidentsService } from "./incidents.service.js";

@Module({
  imports: [AuthModule],
  controllers: [IncidentsController],
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
