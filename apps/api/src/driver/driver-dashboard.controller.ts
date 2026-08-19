import { Controller, Get, UseGuards, Req, Query, SetMetadata } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §18 — Driver dashboard: earnings, completed trips, rating, stats.
 */
@ApiTags("driver-dashboard")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("driver-dashboard")
export class DriverDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregate stats: total trips, completed, earnings, rating.
   */
  @Get("stats")
  @SetMetadata("roles", ["DRIVER"])
  async stats(@Req() req: any) {
    const driverId = req.user.sub;

    const [total, completedRides, driver] = await Promise.all([
      this.prisma.ride.count({ where: { driverId } }),
      this.prisma.ride.findMany({
        where: { driverId, status: "COMPLETED" as any },
        select: { fareMinor: true, currency: true },
      }),
      this.prisma.driver.findUnique({ where: { userId: driverId } }),
    ]);

    const earningsMinor = completedRides.reduce((sum, r) => sum + r.fareMinor, 0);
    const currency = completedRides[0]?.currency || "EGP";
    const completed = completedRides.length;

    return {
      totalTrips: total,
      completedTrips: completed,
      earningsMinor,
      currency,
      formattedEarnings: `${currency} ${(earningsMinor / 100).toFixed(2)}`,
      rating: driver?.rating ?? null,
      status: driver?.status,
      verificationStatus: driver?.verificationStatus,
    };
  }

  /**
   * Completed trips list with pagination.
   */
  @Get("trips")
  @SetMetadata("roles", ["DRIVER"])
  async trips(@Req() req: any, @Query() q: any) {
    const take = Math.min(Number(q.limit) || 20, 50);
    const skip = Number(q.offset) || 0;

    const rides = await this.prisma.ride.findMany({
      where: { driverId: req.user.sub, status: "COMPLETED" as any },
      include: {
        trip: { select: { id: true, title: true } },
        events: { take: 5 },
      },
      take,
      skip,
    });

    const total = await this.prisma.ride.count({
      where: { driverId: req.user.sub, status: "COMPLETED" as any },
    });

    return { items: rides, total, limit: take, offset: skip };
  }

  /**
   * Reviews received by driver.
   */
  @Get("reviews")
  @SetMetadata("roles", ["DRIVER"])
  async reviews(@Req() req: any) {
    // Reviews where target is driver (via ride -> driver relation)
    const completedRideIds = await this.prisma.ride.findMany({
      where: { driverId: req.user.sub, status: "COMPLETED" as any },
      select: { id: true },
    });
    const rideIds = completedRideIds.map((r) => r.id);

    const reviews = await this.prisma.review.findMany({
      where: { bookingId: { in: rideIds } } as any, // Fallback if review targets booking
      take: 20,
    });

    // If no reviews yet, return empty
    return {
      items: reviews,
      count: reviews.length,
      averageRating: reviews.length > 0
        ? reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length
        : null,
    };
  }
}
