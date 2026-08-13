import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { OtpService } from "./otp.service.js";
import { JwtService } from "./jwt.service.js";

@Module({
  controllers: [AuthController],
  providers: [AuthService, OtpService, JwtService],
  exports: [AuthService, JwtService],
})
export class AuthModule {}