import { IsString, IsOptional, IsInt, IsEnum, IsBoolean, IsUUID, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ListUsersQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) offset?: number;
}

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class UpdateRolesDto {
  @ApiProperty({ type: [String] }) @IsString({ each: true }) roles!: string[];
}