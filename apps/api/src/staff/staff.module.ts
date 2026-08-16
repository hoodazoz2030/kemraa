import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { RedisModule } from "../redis/redis.module.js";
import { QueuesModule } from "../queues/queues.module.js";
import { StaffController } from "./staff.controller.js";
import { StaffService } from "./staff.service.js";

@Module({
  imports: [AuthModule, RedisModule, QueuesModule],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
