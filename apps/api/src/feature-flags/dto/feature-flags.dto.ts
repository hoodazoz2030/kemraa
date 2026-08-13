import { IsBoolean } from "class-validator";

export class SetFlagDto {
  @IsBoolean() enabled: boolean;
}