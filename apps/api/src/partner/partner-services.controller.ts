import { Controller, Get, Post, Patch, Delete, Body, UseGuards, Req, Param, Query, SetMetadata, Logger } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §19 — Partner's own service management.
 * Service is linked via `providerId` (Partner.id), which is linked to Organization via organizationId.
 * ServiceStatus values: ACTIVE | PAUSED | ARCHIVED (no DRAFT/INACTIVE).
 */
@ApiTags("partner-services")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("partner-services")
export class PartnerServicesController {
  private readonly logger = new Logger(PartnerServicesController.name);

  constructor(private readonly prisma: PrismaService) {}

      /**
   * providerId = organizationId (Partner shares PK with Organization).
   * Partner entity is auto-created during partner-auth/register.
   */
  private async getProviderId(userId: string): Promise<string | null> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, role: "PARTNER_ADMIN" as any, status: "ACTIVE" as any },
    });
    if (!membership) return null;

    // Verify Partner entity exists (should always exist after register)
    const partner = await this.prisma.partner.findUnique({
      where: { organizationId: membership.organizationId },
    });
    return partner?.organizationId ?? null;
  }

  @Get()
  @SetMetadata("roles", ["CUSTOMER"])
  async list(@Req() req: any, @Query() q: any) {
    const providerId = await this.getProviderId(req.user.sub);
    if (!providerId) return { items: [], total: 0 };

    const where: any = { providerId };
    if (q.status) where.status = q.status;
    if (q.type) where.type = q.type;

    const items = await this.prisma.service.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { items, total: await this.prisma.service.count({ where }) };
  }

  @Get(":id")
  @SetMetadata("roles", ["CUSTOMER"])
  async get(@Req() req: any, @Param("id") id: string) {
    const providerId = await this.getProviderId(req.user.sub);
    const service = await this.prisma.service.findFirst({
      where: { id, providerId: providerId ?? "__none__" },
      include: { availabilities: { take: 10 } },
    });
    if (!service) return { error: { code: "NOT_FOUND" } };
    return service;
  }

  @Post()
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("partner.service.create", "service")
  async create(@Req() req: any, @Body() body: {
    title: string;
    type: string;
    description?: string;
    priceMinor?: number;
    currency?: string;
    metadata?: any;
  }) {
    const providerId = await this.getProviderId(req.user.sub);
    if (!providerId) return { error: { code: "NO_ORGANIZATION" } };

    try {
      const service = await this.prisma.service.create({
        data: {
          providerId,
          title: body.title,
          type: body.type as any,
          description: body.description ?? null,
          priceMinor: body.priceMinor ?? 0,
          currency: body.currency ?? "EGP",
          status: "PAUSED" as any, // New services start as PAUSED (acts as draft)
          metadata: (body.metadata ?? {}) as any,
        } as any,
      });
      this.logger.log(`Partner service created: ${service.id}`);
      return service;
    } catch (err: any) {
      this.logger.error(`Service create failed: ${err.message}`);
      return { error: { code: "CREATE_FAILED", message: err.message } };
    }
  }

  @Patch(":id")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("partner.service.update", "service")
  async update(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    const providerId = await this.getProviderId(req.user.sub);
    const existing = await this.prisma.service.findFirst({ where: { id, providerId: providerId ?? "__none__" } });
    if (!existing) return { error: { code: "NOT_FOUND" } };

    const data: any = {};
    for (const k of ["title", "description", "priceMinor", "currency", "status", "metadata", "type"]) {
      if (body[k] !== undefined) data[k] = body[k];
    }

    return await this.prisma.service.update({ where: { id }, data });
  }

  /**
   * Publish service (PAUSED → ACTIVE).
   */
  @Post(":id/publish")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("partner.service.publish", "service")
  async publish(@Req() req: any, @Param("id") id: string) {
    const providerId = await this.getProviderId(req.user.sub);
    const existing = await this.prisma.service.findFirst({ where: { id, providerId: providerId ?? "__none__" } });
    if (!existing) return { error: { code: "NOT_FOUND" } };
    if (existing.status !== "PAUSED") {
      return { error: { code: "INVALID_STATE", message: "Only PAUSED services can be published" } };
    }
    return await this.prisma.service.update({ where: { id }, data: { status: "ACTIVE" as any } });
  }

  @Delete(":id")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("partner.service.delete", "service")
  async delete(@Req() req: any, @Param("id") id: string) {
    const providerId = await this.getProviderId(req.user.sub);
    const existing = await this.prisma.service.findFirst({ where: { id, providerId: providerId ?? "__none__" } });
    if (!existing) return { error: { code: "NOT_FOUND" } };
    await this.prisma.service.delete({ where: { id } });
    return { success: true };
  }

  // ============ Availability endpoints ============

  @Get(":id/availability")
  @SetMetadata("roles", ["CUSTOMER"])
  async listAvailability(@Req() req: any, @Param("id") id: string, @Query() q: any) {
    const providerId = await this.getProviderId(req.user.sub);
    const service = await this.prisma.service.findFirst({ where: { id, providerId: providerId ?? "__none__" } });
    if (!service) return { error: { code: "NOT_FOUND" } };

    const where: any = { serviceId: id };
    if (q.from) where.date = { gte: new Date(q.from) };

    const slots = await this.prisma.serviceAvailability.findMany({ where, take: 100 });
    return { slots, total: slots.length };
  }

  @Post(":id/availability")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("partner.availability.create", "service")
  async addSlot(@Req() req: any, @Param("id") id: string, @Body() body: { date: string; startTime: string; endTime: string; capacity?: number }) {
    const providerId = await this.getProviderId(req.user.sub);
    const service = await this.prisma.service.findFirst({ where: { id, providerId: providerId ?? "__none__" } });
    if (!service) return { error: { code: "NOT_FOUND" } };

    try {
      const slot = await this.prisma.serviceAvailability.create({
        data: {
          serviceId: id,
          date: new Date(body.date),
          startTime: body.startTime,
          endTime: body.endTime,
          capacity: body.capacity ?? 1,
        } as any,
      });
      return slot;
    } catch (err: any) {
      return { error: { code: "CREATE_FAILED", message: err.message } };
    }
  }

  @Delete("availability/:slotId")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("partner.availability.delete", "service")
  async deleteSlot(@Req() req: any, @Param("slotId") slotId: string) {
    const providerId = await this.getProviderId(req.user.sub);
    const slot = await this.prisma.serviceAvailability.findUnique({
      where: { id: slotId },
      include: { service: true },
    });
    if (!slot || slot.service.providerId !== providerId) return { error: { code: "NOT_FOUND" } };

    await this.prisma.serviceAvailability.delete({ where: { id: slotId } });
    return { success: true };
  }
}
