import { IsOptional, IsString, IsDateString, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class ListAuditLogsDto {
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsString() resourceType?: string;
  @IsOptional() @IsString() actorId?: string;
  @IsOptional() @IsString() resourceId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 50;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number = 0;
}