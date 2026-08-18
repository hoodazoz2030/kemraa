import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { FinanceAdminController } from "./finance-admin.controller.js";
import { FinanceAdminService } from "./finance-admin.service.js";

@Module({
  imports: [AuthModule],
  controllers: [FinanceAdminController],
  providers: [FinanceAdminService],
  exports: [FinanceAdminService],
})
export class FinanceAdminModule {}
