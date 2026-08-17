import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { SigningController } from "./signing.controller.js";
import { PublicSigningController } from "./public-signing.controller.js";
import { SigningService } from "./signing.service.js";

@Module({
  imports: [AuthModule],
  controllers: [SigningController, PublicSigningController],
  providers: [SigningService],
  exports: [SigningService],
})
export class SigningModule {}
