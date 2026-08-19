import { Module, Global } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { EventBusService } from "./event-bus.service.js";
import { EventsController } from "./events.controller.js";

@Global()
@Module({
  imports: [AuthModule],
  controllers: [EventsController],
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventsModule {}
