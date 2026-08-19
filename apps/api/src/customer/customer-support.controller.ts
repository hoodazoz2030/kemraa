import { Controller, Get, Post, Body, UseGuards, Req, Param, SetMetadata, Logger } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

@ApiTags("customer-support")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("customer-support")
export class CustomerSupportController {
  private readonly logger = new Logger(CustomerSupportController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get("tickets")
  @SetMetadata("roles", ["CUSTOMER"])
  async listTickets(@Req() req: any) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { userId: req.user.sub },
      include: { replies: { take: 3 } },
      take: 50,
    });
    return { items: tickets, total: tickets.length };
  }

  @Get("tickets/:id")
  @SetMetadata("roles", ["CUSTOMER"])
  async getTicket(@Req() req: any, @Param("id") id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, userId: req.user.sub },
      include: { replies: {} },
    });
    if (!ticket) return { error: { code: "NOT_FOUND" } };
    return ticket;
  }

  @Post("tickets")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("support.create_ticket", "ticket")
  async createTicket(@Req() req: any, @Body() body: { subject: string; body: string; category?: string; priority?: string; bookingId?: string; tripId?: string }) {
    try {
      const ticket = await this.prisma.supportTicket.create({
        data: {
          userId: req.user.sub,
          subject: body.subject,
          body: body.body,
          category: body.category || "OTHER",
          priority: (body.priority || "MEDIUM") as any,
          status: "OPEN" as any,
          tripId: body.tripId ?? null,
        },
      });
      this.logger.log(`Ticket created: ${ticket.id}`);
      return ticket;
    } catch (err: any) {
      this.logger.error(`Ticket create failed: ${err.message}`);
      return { error: { code: "CREATE_FAILED", message: err.message } };
    }
  }

  @Post("tickets/:id/reply")
  @SetMetadata("roles", ["CUSTOMER"])
  async replyToTicket(@Req() req: any, @Param("id") id: string, @Body() body: { body: string }) {
    const ticket = await this.prisma.supportTicket.findFirst({ where: { id, userId: req.user.sub } });
    if (!ticket) return { error: { code: "NOT_FOUND" } };
    if ((ticket as any).status === "CLOSED") return { error: { code: "TICKET_CLOSED" } };

    const reply = await this.prisma.supportReply.create({
      data: {
        ticketId: id,
        authorId: req.user.sub,
        body: body.body,
      },
    });
    return reply;
  }
}
