import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { AnalyticsService } from "./analytics.service.js";

@ApiTags("analytics")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles("ADMIN", "STAFF")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("overview")
  overview(@Query("days") days?: string) {
    return this.analytics.overview(days ? parseInt(days, 10) : 14);
  }
}