import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { ThothController } from "./thoth.controller.js";
import { ThothGatewayService } from "./gateway.service.js";
import { ThothPolicyEngine } from "./policy-engine.service.js";
import { ThothContextLoader } from "./context-loader.service.js";
import { ThothToolExecutor } from "./tool-executor.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ThothController],
  providers: [ThothGatewayService, ThothPolicyEngine, ThothContextLoader, ThothToolExecutor],
  exports: [ThothGatewayService],
})
export class ThothModule {}
