import { Controller, Get, Param, Query, UseGuards, SetMetadata } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §12 — Customer-facing Service discovery.
 * Route prefix: /customer-services (distinct from admin /services).
 */
@ApiTags("customer-services")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("customer-services")
export class CustomerServicesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @SetMetadata("roles", ["CUSTOMER"])
  async search(@Query() q: any) {
    const where: any = { status: "ACTIVE" };
    if (q.type) where.type = q.type;
    if (q.country) where.country = q.country;
    if (q.q) {
      where.OR = [
        { title: { contains: q.q, mode: "insensitive" } },
        { description: { contains: q.q, mode: "insensitive" } },
      ];
    }

    const items = await this.prisma.service.findMany({
      where,
      include: {
        provider: { include: { organization: { select: { displayName: true, legalName: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Number(q.limit) || 20, 50),
    });

    return {
      items: items.map((s: any) => ({
        id: s.id,
        title: s.title,
        type: s.type,
        country: s.country,
        priceMinor: s.priceMinor,
        currency: s.currency,
        provider: s.provider?.organization?.displayName || s.provider?.organization?.legalName,
        rating: 0, // TODO: aggregate from reviews
      })),
      total: await this.prisma.service.count({ where }),
    };
  }

  @Get(":id")
  @SetMetadata("roles", ["CUSTOMER"])
  async detail(@Param("id") id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, status: "ACTIVE" },
      include: {
        provider: { include: { organization: true } },
      },
    });
    if (!service) return { error: { code: "NOT_FOUND", message: "Service not found" } };
    return service;
  }
}
