import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { ReviewsService } from "./reviews.service.js";

@ApiTags("reviews")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly svc: ReviewsService) {}

  @Get() list(@Query() q: any) { return this.svc.list(q); }
  @Get("stats") stats() { return this.svc.stats(); }
  @Get(":id") detail(@Param("id", new ParseUUIDPipe()) id: string) { return this.svc.detail(id); }

  @Post(":id/approve")
  @Roles("SUPER_ADMIN", "ADMIN") @Audit("review.approve", "review")
  approve(@Param("id", new ParseUUIDPipe()) id: string) { return this.svc.moderate(id, "APPROVE"); }

  @Post(":id/hide")
  @Roles("SUPER_ADMIN", "ADMIN") @Audit("review.hide", "review")
  hide(@Param("id", new ParseUUIDPipe()) id: string) { return this.svc.moderate(id, "HIDE"); }

  @Delete(":id")
  @Roles("SUPER_ADMIN") @Audit("review.delete", "review") @HttpCode(HttpStatus.OK)
  remove(@Param("id", new ParseUUIDPipe()) id: string) { return this.svc.moderate(id, "DELETE"); }
}
