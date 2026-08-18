import { IsString, IsOptional, IsObject, IsNotEmpty, IsIn } from "class-validator";

export class BookingTransitionDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([
    "DRAFT", "PENDING_APPROVAL", "PAYMENT_PENDING", "CONFIRMING", "CONFIRMED",
    "REJECTED", "FAILED", "CANCEL_REQUESTED", "CANCELLED", "COMPLETED", "DISPUTED",
  ])
  toStatus!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class BookingCreateDto {
  @IsOptional()
  @IsString()
  tripId?: string;

  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @IsOptional()
  @IsObject()
  items?: any[];

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
