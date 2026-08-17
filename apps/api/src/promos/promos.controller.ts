import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PromosService } from "./promos.service.js";

@ApiTags("promos")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("promos")
export class PromosController {
  constructor(private readonly svc: PromosService) {}

  @Get() list() { return this.svc.list(); }

  @Post()
  @Roles("SUPER_ADMIN", "ADMIN")
  @Audit("promo.create", "promo")
  @HttpCode(HttpStatus.CREATED)
  create(@Body() b: any) { return this.svc.create(b); }

  @Patch(":id")
  @Roles("SUPER_ADMIN", "ADMIN")
  @Audit("promo.update", "promo")
  update(@Param("id", new ParseUUIDPipe()) id: string, @Body() b: any) { return this.svc.update(id, b); }

  @Delete(":id")
  @Roles("SUPER_ADMIN", "ADMIN")
  @Audit("promo.delete", "promo")
  remove(@Param("id", new ParseUUIDPipe()) id: string) { return this.svc.remove(id); }

  @Post("validate")
  @HttpCode(HttpStatus.OK)
  validate(@Body() b: { code: string; amountMinor: number }) { return this.svc.validate(b.code, b.amountMinor); }
}
