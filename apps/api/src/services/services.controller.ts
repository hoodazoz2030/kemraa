import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { ServicesService } from "./services.service.js";
import { CreateServiceDto, UpdateServiceDto, ListServicesQueryDto } from "./dto/services.dto.js";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Request } from "express";

const MANAGE_ROLES = ["ADMIN", "SUPER_ADMIN", "PARTNER_ADMIN", "PARTNER_STAFF", "AGENCY_ADMIN", "OPERATIONS", "CONTENT"];

@ApiTags("services")
@ApiBearerAuth()
@Controller("services")
@UseGuards(RolesGuard)
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Post()
  @Roles(...MANAGE_ROLES)
  @ApiOperation({ summary: "Create a new service (DRAFT)" })
  create(@Req() req: Request, @Body() dto: CreateServiceDto) {
    return this.services.create((req as any).user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: "List services (public, with filters)" })
  list(@Query() query: ListServicesQueryDto) {
    return this.services.list(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get service detail" })
  getOne(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.services.getOne(id);
  }

  @Patch(":id")
  @Roles(...MANAGE_ROLES)
  @ApiOperation({ summary: "Update service" })
  update(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string, @Body() dto: UpdateServiceDto) {
    return this.services.update((req as any).user.sub, id, dto);
  }

  @Post(":id/status")
  @Roles(...MANAGE_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Change service status (DRAFT->ACTIVE->PAUSED->ARCHIVED)" })
  setStatus(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string, @Body("status") status: string) {
    return this.services.setStatus((req as any).user.sub, id, status);
  }

  @Delete(":id")
  @Roles(...MANAGE_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Archive service (soft delete)" })
  remove(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string) {
    return this.services.remove((req as any).user.sub, id);
  }
}