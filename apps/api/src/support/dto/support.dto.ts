import { IsString, IsOptional, IsUUID, IsInt, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateTicketDto {
  @ApiProperty({ description: "Short category/title, e.g. 'PAYMENT_ISSUE', 'BOOKING_PROBLEM'" })
  @IsString() @MinLength(3) category!: string;
  @ApiPropertyOptional({ enum: ["LOW","MEDIUM","HIGH","URGENT"], default: "MEDIUM" })
  @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() tripId?: string;
}

export class UpdateTicketDto {
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedTo?: string;
}

export class ListTicketsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) offset?: number;
}

export class CreateIncidentDto {
  @ApiProperty({ description: "Incident type, e.g. 'PAYMENT', 'SAFETY', 'TECHNICAL'" })
  @IsString() @MinLength(3) type!: string;
  @ApiProperty({ enum: ["LOW","MEDIUM","HIGH","CRITICAL"], default: "MEDIUM" })
  @IsOptional() @IsString() severity?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() tripId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resolution?: string;
}

export class ResolveIncidentDto {
  @ApiProperty() @IsString() @MinLength(5) resolution!: string;
}

export class ListIncidentsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() severity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) offset?: number;
}