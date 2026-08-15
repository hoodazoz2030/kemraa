import { IsString, IsInt, IsOptional, IsUUID, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreatePaymentIntentDto {
  @IsString() bookingId: string;
  @IsInt() @Min(100) @Type(() => Number) amountMinor: number; // in cents/piastres
  @IsString() currency: string; // "egp", "usd"
  @IsOptional() @IsString() description?: string;
}

export class ConfirmPaymentDto {
  @IsString() paymentIntentId: string;
}