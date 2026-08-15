import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async update(userId: string, data: { latitude: number; longitude: number; accuracy?: number; source?: string; battery?: number }) {
    return this.prisma.userLocation.upsert({
      where: { userId },
      update: {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        source: data.source,
        battery: data.battery,
      },
      create: {
        userId,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        source: data.source,
        battery: data.battery,
      },
    });
  }

  async getMine(userId: string) {
    const loc = await this.prisma.userLocation.findUnique({ where: { userId } });
    return loc ?? null;
  }

  async adminList(activeMinutes = 60) {
    const since = new Date(Date.now() - activeMinutes * 60_000);
    const locations = await this.prisma.userLocation.findMany({
      where: { updatedAt: { gte: since } },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            status: true,
            profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    return locations.map((l) => ({
      id: l.id,
      userId: l.userId,
      latitude: l.latitude,
      longitude: l.longitude,
      accuracy: l.accuracy,
      source: l.source,
      battery: l.battery,
      updatedAt: l.updatedAt,
      user: l.user,
      displayName:
        [l.user.profile?.firstName, l.user.profile?.lastName].filter(Boolean).join(" ") ||
        l.user.email ||
        l.user.phone ||
        "Unknown",
    }));
  }

  async adminGet(userId: string) {
    const loc = await this.prisma.userLocation.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true, email: true, phone: true, status: true,
            profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!loc) return null;
    return {
      ...loc,
      displayName:
        [loc.user.profile?.firstName, loc.user.profile?.lastName].filter(Boolean).join(" ") ||
        loc.user.email ||
        "Unknown",
    };
  }

  async adminDelete(userId: string) {
    try {
      await this.prisma.userLocation.delete({ where: { userId } });
      return { deleted: true };
    } catch {
      return { deleted: false };
    }
  }
}