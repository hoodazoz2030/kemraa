import { Controller, Post, Get, Body, UseGuards, Req, Query, SetMetadata, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { ThothGatewayService } from "../thoth/gateway.service.js";

/**
 * §13 + §12 — Customer-facing THOTH chat.
 * Wraps the existing ThothGatewayService with CUSTOMER role guard.
 */
@ApiTags("customer-thoth")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("customer-thoth")
export class CustomerThothController {
  constructor(private readonly gateway: ThothGatewayService) {}

  @Post("chat")
  @HttpCode(HttpStatus.OK)
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("thoth.customer_chat", "thoth")
  async chat(@Req() req: any, @Body() body: { message: string; sessionId?: string }) {
    return this.gateway.chat({
      message: body.message,
      sessionId: body.sessionId,
      userId: req.user.sub,
      userRoles: req.user.roles ?? ["CUSTOMER"],
    });
  }

  @Get("history")
  @SetMetadata("roles", ["CUSTOMER"])
  async history(@Req() req: any, @Query("sessionId") sessionId?: string) {
    return this.gateway.getHistory(req.user.sub, sessionId, 50);
  }

  @Get("sessions")
  @SetMetadata("roles", ["CUSTOMER"])
  async sessions(@Req() req: any) {
    // Customer only sees their own sessions — filtered by userId inside getHistory
    const msgs = await this.gateway.getHistory(req.user.sub, undefined, 200);
    const sessionIds = [...new Set(msgs.map((m: any) => m.sessionId))];
    return { sessions: sessionIds.length };
  }
}
