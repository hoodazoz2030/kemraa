import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service.js";
import { SendNotificationDto, UpdatePreferencesDto, ListNotificationsQueryDto } from "./dto/notifications.dto.js";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Request } from "express";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "OPERATIONS", "SUPPORT"];

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
@UseGuards(RolesGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post()
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: "Send notification (admin only)" })
  send(@Body() dto: SendNotificationDto) {
    return this.notifications.send(dto);
  }

  @Get()
  @ApiOperation({ summary: "List my notifications" })
  list(@Req() req: Request, @Query() query: ListNotificationsQueryDto) {
    return this.notifications.list((req as any).user.sub, query);
  }

  @Get("preferences")
  @ApiOperation({ summary: "Get my notification preferences" })
  getPreferences(@Req() req: Request) {
    return this.notifications.getPreferences((req as any).user.sub);
  }

  @Patch("preferences")
  @ApiOperation({ summary: "Update my notification preferences" })
  updatePreferences(@Req() req: Request, @Body() dto: UpdatePreferencesDto) {
    return this.notifications.updatePreferences((req as any).user.sub, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get notification detail" })
  getOne(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string) {
    return this.notifications.getOne((req as any).user.sub, id);
  }

  @Post(":id/read")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark notification as read" })
  markRead(@Req() req: Request, @Param("id", new ParseUUIDPipe()) id: string) {
    return this.notifications.markRead((req as any).user.sub, id);
  }

  @Post("read-all")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark all notifications as read" })
  markAllRead(@Req() req: Request) {
    return this.notifications.markAllRead((req as any).user.sub);
  }
}