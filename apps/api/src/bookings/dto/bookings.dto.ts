import { IsString, IsOptional, IsInt, IsUUID, IsArray, ValidateNested, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BookingItemDto {
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() @Type(() => Number) quantity?: number;
  @ApiProperty() @IsInt() @Type(() => Number) unitMinor!: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Type(() => Number) taxMinor?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Type(() => Number) feeMinor?: number;
}

export class CreateBookingDto {
  @ApiProperty() @IsUUID() serviceId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() tripId?: string;
  @ApiProperty() @IsString() @MinLength(8) idempotencyKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() externalRef?: string;
  @ApiProperty({ type: [BookingItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => BookingItemDto)
  items!: BookingItemDto[];
}

export class SubmitPaymentDto {
  @ApiProperty() @IsString() provider!: string;
  @ApiProperty() @IsString() methodType!: string;
  @ApiProperty() @IsString() @MinLength(8) idempotencyKey!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() providerPaymentId?: string;
}

export class ConfirmBookingDto {
  @ApiPropertyOptional() @IsOptional() @IsString() externalRef?: string;
}

export class CreateReviewDto {
  @ApiProperty() @IsString() targetType!: string;
  @ApiProperty() @IsUUID() targetId!: string;
  @ApiProperty() @IsInt() @Type(() => Number) rating!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}

export class ListBookingsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() tripId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) offset?: number;
}