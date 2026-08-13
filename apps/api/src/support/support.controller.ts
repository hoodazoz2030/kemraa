import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { SupportService } from "./support.service.js";
import { CreateTicketDto, UpdateTicketDto, ListTicketsQueryDto, CreateIncidentDto, ResolveIncidentDto, ListIncidentsQueryDto } from "./dto/support.dto.js";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Request } from "express";

const SUPPORT_ROLES = ["ADMIN", "SUPER_ADMIN", "SUPPORT", "OPERATIONS"];

@ApiTags("support")
@ApiBearerAuth()
@Controller("support")
@UseGuards(RolesGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post("tickets") @ApiOperation({ summary: "Create support ticket" })
  createTicket(@Req() req: Request, @Body() dto: CreateTicketDto) {
    return this.support.createTicket((req as any).user.sub, dto);
  }

  @Get("tickets") @ApiOperation({ summary: "List tickets (mine for customer, all for support staff)" })
  listTickets(@Req() req: Request, @Query() query: ListTicketsQueryDto) {
    const roles: string[] = (req as any).user?.roles ?? [];
    const isAdmin = roles.some((r) => SUPPORT_ROLES.includes(r));
    return this.support.listTickets((req as any).user.sub, isAdmin, query);
  }

  @Get("tickets/:id") @ApiOperation({ summary: "Get ticket detail" })
  getTicket(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string) {
    const roles: string[] = (req as any).user?.roles ?? [];
    const isAdmin = roles.some((r) => SUPPORT_ROLES.includes(r));
    return this.support.getTicket((req as any).user.sub, isAdmin, id);
  }

  @Patch("tickets/:id") @Roles(...SUPPORT_ROLES) @ApiOperation({ summary: "Update ticket (status, priority, assignedTo)" })
  updateTicket(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string, @Body() dto: UpdateTicketDto) {
    return this.support.updateTicket((req as any).user.sub, id, dto);
  }

  @Get("tickets/:id/sla") @ApiOperation({ summary: "Check SLA metrics for ticket" })
  checkSla(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.support.checkSla(id);
  }

  @Post("incidents") @ApiOperation({ summary: "Create incident" })
  createIncident(@Req() req: Request, @Body() dto: CreateIncidentDto) {
    return this.support.createIncident((req as any).user.sub, dto);
  }

  @Get("incidents") @ApiOperation({ summary: "List incidents" })
  listIncidents(@Query() query: ListIncidentsQueryDto) {
    return this.support.listIncidents(query);
  }

  @Get("incidents/:id") @ApiOperation({ summary: "Get incident detail" })
  getIncident(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.support.getIncident(id);
  }

  @Post("incidents/:id/resolve") @Roles(...SUPPORT_ROLES) @HttpCode(HttpStatus.OK) @ApiOperation({ summary: "Resolve incident" })
  resolveIncident(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string, @Body() dto: ResolveIncidentDto) {
    return this.support.resolveIncident((req as any).user.sub, id, dto);
  }
}