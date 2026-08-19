import { Body, Controller, Get, Post, Query, Req, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { ThothGatewayService } from "./gateway.service.js";

@ApiTags("thoth")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("thoth")
export class ThothController {
  constructor(private readonly gateway: ThothGatewayService) {}

  @Post("chat")
  @HttpCode(HttpStatus.OK)
  @Audit("thoth.chat", "thoth")
  async chat(@Body() b: { message: string; sessionId?: string }, @Req() req: any) {
    return this.gateway.chat({
      message: b.message,
      sessionId: b.sessionId,
      userId: req.user?.sub ?? req.user?.userId,
      userRoles: req.user?.roles ?? [],
    });
  }

  @Get("history")
  @Roles("SUPER_ADMIN", "ADMIN", "OPERATIONS")
  async history(@Query("userId") userId?: string, @Query("sessionId") sessionId?: string) {
    return this.gateway.getHistory(userId, sessionId);
  }

  @Get("sessions")
  @Roles("SUPER_ADMIN", "ADMIN", "OPERATIONS")
  async sessions() {
    return this.gateway.getSessions();
  }

  @Get("stats")
  @Roles("SUPER_ADMIN", "ADMIN", "OPERATIONS")
  async stats() {
    return this.gateway.getStats();
  }
}
