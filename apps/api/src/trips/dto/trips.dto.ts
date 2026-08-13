import { IsString, IsOptional, IsDateString, IsInt, IsObject, IsArray, ValidateNested, MinLength, IsUUID } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTripDto {
  @ApiProperty() @IsString() @MinLength(2) title!: string;
  @ApiPropertyOptional({ default: "EG" }) @IsOptional() @IsString() destinationCountry?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endAt?: string;
  @ApiPropertyOptional({ default: "EGP" }) @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Type(() => Number) budgetMinor?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() agencyId?: string;
}

export class UpdateTripDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() destinationCountry?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) budgetMinor?: number;
}

export class ItineraryItemDto {
  @ApiProperty() @IsString() type!: string;
  @ApiProperty() @IsString() @MinLength(1) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() location?: Record<string, unknown>;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Type(() => Number) estimatedMinor?: number;
}

export class AddItineraryItemsDto {
  @ApiProperty({ type: [ItineraryItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => ItineraryItemDto)
  items!: ItineraryItemDto[];
}

export class RejectTripDto {
  @ApiProperty() @IsString() @MinLength(5) reason!: string;
}

export class ListTripsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) offset?: number;
}