import { IsString, IsOptional, IsEnum, IsUUID, IsArray, IsObject, IsInt, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SendNotificationDto {
  @ApiProperty() @IsUUID() recipientId!: string;
  @ApiProperty({ enum: ["EMAIL", "SMS", "PUSH", "IN_APP"] }) @IsString() channel!: string;
  @ApiProperty() @IsString() @MinLength(1) title!: string;
  @ApiProperty() @IsString() @MinLength(1) body!: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) delaySeconds?: number;
}

export class UpdatePreferencesDto {
  @ApiPropertyOptional() @IsOptional() @IsArray() email?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() sms?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() push?: string[];
}

export class ListNotificationsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() channel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) offset?: number;
}