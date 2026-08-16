import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { RedisModule } from "../redis/redis.module.js";
import { StaffController } from "./staff.controller.js";
import { StaffService } from "./staff.service.js";

@Module({
  imports: [AuthModule, RedisModule],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
