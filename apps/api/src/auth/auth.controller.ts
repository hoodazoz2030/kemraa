import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { AuthService } from "./auth.service.js";
import { RequestOtpDto, VerifyOtpDto, RefreshTokenDto, LogoutDto } from "./dto/auth.dto.js";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("otp/request")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request OTP (email/SMS)" })
  requestOtp(@Body() dto: RequestOtpDto) { return this.auth.requestOtp(dto.identifier, dto.channel); }

  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify OTP and get tokens" })
  verifyOtp(@Body() dto: VerifyOtpDto) { return this.auth.verifyOtp(dto.identifier, dto.channel, dto.code); }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token" })
  refresh(@Body() dto: RefreshTokenDto) { return this.auth.refresh(dto.refreshToken); }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout (invalidate session)" })
  logout(@Body() dto: LogoutDto) { return this.auth.logout(dto.refreshToken); }
}