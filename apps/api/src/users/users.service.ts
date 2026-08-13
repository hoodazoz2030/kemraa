import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { Prisma } from "@prisma/client";
import { ListUsersQueryDto } from "./dto/users.dto.js";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        orgMembers: {
          select: {
            role: true,
            organization: { select: { displayName: true, type: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException({ code: "USER_NOT_FOUND" });
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      locale: user.locale,
      timezone: user.timezone,
      status: user.status,
      mfaEnabled: user.mfaEnabled,
      profile: user.profile,
      roles: user.orgMembers.map((m: any) => m.role),
      organizations: user.orgMembers.map((m: any) => ({
        role: m.role,
        name: m.organization.displayName,
        type: m.organization.type,
      })),
    };
  }

  async list(query: ListUsersQueryDto) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: "insensitive" } },
        { phone: { contains: query.search, mode: "insensitive" } },
      ];
    }
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(query.limit ?? 50, 200),
        skip: query.offset ?? 0,
        include: {
          profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          orgMembers: {
            select: {
              role: true,
              organization: { select: { displayName: true } },
            },
          },
          _count: {
            select: { trips: true, bookings: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const items = users.map((u: any) => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      status: u.status,
      mfaEnabled: u.mfaEnabled,
      firstName: u.profile?.firstName,
      lastName: u.profile?.lastName,
      avatarUrl: u.profile?.avatarUrl,
      roles: u.orgMembers.map((m: any) => m.role),
      organization: u.orgMembers[0]?.organization?.displayName,
      tripsCount: u._count.trips,
      bookingsCount: u._count.bookings,
      createdAt: u.createdAt,
    }));

    return { items, total, limit: query.limit ?? 50, offset: query.offset ?? 0 };
  }
}