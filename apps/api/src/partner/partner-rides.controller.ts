import { Controller, Get, Param, Req, UseGuards, ParseUUIDPipe, BadRequestException } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PartnerGuard } from "../common/guards/partner.guard.js";
import { PrismaService } from "../prisma/prisma.service.js";

@ApiTags("partner-rides")
@ApiBearerAuth()
@UseGuards(PartnerGuard)
@Controller("partner-rides")
export class PartnerRidesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: any) {
    const driverIds = (await this.prisma.driver.findMany({
      where: { partnerId: req.partnerUser.partnerId },
      select: { userId: true },
    })).map((d) => d.userId);

    const items = await this.prisma.ride.findMany({
      where: { driverId: { in: driverIds } },
      include: {
        driver: { include: { user: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } } } },
        events: { orderBy: { occurredAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return { items, total: items.length };
  }

  @Get(":id")
  async detail(@Req() req: any, @Param("id", new ParseUUIDPipe()) id: string) {
    const driverIds = (await this.prisma.driver.findMany({
      where: { partnerId: req.partnerUser.partnerId },
      select: { userId: true },
    })).map((d) => d.userId);

    const ride = await this.prisma.ride.findFirst({
      where: { id, driverId: { in: driverIds } },
      include: {
        driver: { include: { user: true } },
        events: { orderBy: { occurredAt: "asc" } },
        incidents: true,
        trip: true,
      },
    });
    if (!ride) throw new BadRequestException({ code: "NOT_FOUND" });
    return ride;
  }

  @Get("stats")
  async stats(@Req() req: any) {
    const driverIds = (await this.prisma.driver.findMany({
      where: { partnerId: req.partnerUser.partnerId },
      select: { userId: true },
    })).map((d) => d.userId);

    const rides = await this.prisma.ride.findMany({ where: { driverId: { in: driverIds } } });
    const byStatus: any = {};
    for (const r of rides) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    const totalFare = rides.reduce((s, r) => s + r.fareMinor, 0);
    return { total: rides.length, byStatus, totalFareMinor: totalFare, currency: rides[0]?.currency ?? "EGP" };
  }
}
