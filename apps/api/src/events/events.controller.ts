import { Controller, Get, Post, Body, UseGuards, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { EventBusService } from "./event-bus.service.js";
import { EVENT_TYPES, EventType } from "./event-catalog.js";

@ApiTags("admin-events")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("admin/events")
export class EventsController {
  constructor(private readonly eventBus: EventBusService) {}

  @Get("catalog")
  @Roles("SUPER_ADMIN", "ADMIN", "OPERATIONS")
  getCatalog() {
    return {
      eventTypes: Object.values(EVENT_TYPES),
      count: Object.keys(EVENT_TYPES).length,
    };
  }

  @Get("stats")
  @Roles("SUPER_ADMIN", "ADMIN", "OPERATIONS")
  async getStats() {
    return this.eventBus.getStats();
  }

  @Post("emit")
  @Roles("SUPER_ADMIN", "ADMIN", "OPERATIONS")
  async emitTestEvent(@Body() body: { type: EventType; payload: any; userId: string }) {
    const eventId = await this.eventBus.emit(body.type, { ...body.payload, userId: body.userId }, {
      actor: "admin-test",
      source: "admin-ui",
    });
    return { eventId, type: body.type, status: "emitted" };
  }
}
