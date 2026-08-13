import { IsEmail, IsOptional, IsString, MinLength, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum OtpChannel { EMAIL = "EMAIL", SMS = "SMS" }

export class RequestOtpDto {
  @ApiProperty() @IsString() identifier!: string; // email or phone
  @ApiProperty({ enum: OtpChannel }) @IsEnum(OtpChannel) channel!: OtpChannel;
}

export class VerifyOtpDto {
  @ApiProperty() @IsString() identifier!: string;
  @ApiProperty() @IsString() @MinLength(4) code!: string;
  @ApiProperty({ enum: OtpChannel }) @IsEnum(OtpChannel) channel!: OtpChannel;
}

export class RefreshTokenDto {
  @ApiProperty() @IsString() refreshToken!: string;
}

export class LogoutDto {
  @ApiProperty() @IsString() refreshToken!: string;
}