import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §13 — Context Loader
 * Gathers relevant context about the user/trip/bookings for THOTH.
 */
@Injectable()
export class ThothContextLoader {
  private readonly logger = new Logger(ThothContextLoader.name);

  constructor(private readonly prisma: PrismaService) {}

  async load(userId?: string, sessionId?: string) {
    const context: any = {
      timestamp: new Date().toISOString(),
    };

    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          trips: {
            orderBy: { createdAt: "desc" },
            take: 3,
          },
          bookings: {
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { service: { select: { title: true, type: true } } },
          },
        },
      });

      if (user) {
        context.user = {
          id: user.id,
          email: user.email,
          locale: user.locale,
          firstName: user.profile?.firstName,
          recentTrips: user.trips.map((t: any) => ({
            id: t.id,
            title: t.title,
            destination: t.destinationCountry,
            status: t.status,
            startAt: t.startAt,
          })),
          recentBookings: user.bookings.map((b: any) => ({
            id: b.id,
            service: b.service?.title,
            type: b.service?.type,
            status: b.status,
            amount: `${b.currency} ${(b.totalMinor / 100).toFixed(2)}`,
          })),
        };
      }
    }

    return context;
  }
}
