import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Roles } from "../common/guards/roles.guard.js";
import { AuditLogsService } from "./audit-logs.service.js";
import { ListAuditLogsDto } from "./dto/audit-logs.dto.js";

@Controller("audit-logs")
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @Get()
  @Roles("ADMIN", "STAFF")
  list(@Query() q: ListAuditLogsDto) {
    return this.service.list(q);
  }
}