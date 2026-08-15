import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { Prisma } from "@prisma/client";
import { ListUsersQueryDto } from "./dto/users.dto.js";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async list(query: ListUsersQueryDto) {
    const { search, status, role, limit = 100, offset = 0 } = query;

    const where: Prisma.UserWhereInput = {};
    if (status) where.status = status as any;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { profile: { firstName: { contains: search, mode: "insensitive" } } },
        { profile: { lastName: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (role) {
      where.orgMembers = { some: { role: role as any } };
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          profile: true,
          orgMembers: {
            include: { organization: { select: { legalName: true, displayName: true } } },
          },
          _count: { select: { trips: true, bookings: true, tickets: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.user.count({ where }),
    ]);

    const enriched = items.map((u) => {
      const roles = [...new Set(u.orgMembers.map((m: any) => m.role))];
      if (roles.length === 0) roles.push("CUSTOMER");
      return {
        id: u.id,
        email: u.email,
        phone: u.phone,
        status: u.status,
        mfaEnabled: u.mfaEnabled,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        firstName: u.profile?.firstName ?? null,
        lastName: u.profile?.lastName ?? null,
        avatarUrl: u.profile?.avatarUrl ?? null,
        roles,
        organization: u.orgMembers[0]?.organization?.displayName ?? u.orgMembers[0]?.organization?.legalName ?? null,
        tripsCount: u._count.trips,
        bookingsCount: u._count.bookings,
        ticketsCount: u._count.tickets,
      };
    });

    return { items: enriched, total };
  }

  async getDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        orgMembers: {
          include: { organization: { select: { legalName: true, displayName: true } } },
        },
        trips: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true, title: true, status: true, destinationCountry: true,
            startAt: true, endAt: true, budgetMinor: true, currency: true, createdAt: true,
          },
        },
        bookings: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true, status: true, totalMinor: true, currency: true, createdAt: true,
            service: { select: { title: true, type: true } },
          },
        },
        tickets: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, subject: true, status: true, priority: true, category: true, createdAt: true },
        },
        notifications: {
          orderBy: { sentAt: "desc" },
          take: 5,
          select: { id: true, title: true, type: true, readAt: true, sentAt: true },
        },
        _count: { select: { trips: true, bookings: true, tickets: true, notifications: true } },
      },
    });
    if (!user) throw new NotFoundException("User not found");

    const roles = [...new Set((user as any).orgMembers.map((m: any) => m.role))];
    if (roles.length === 0) roles.push("CUSTOMER");

    return {
      ...user,
      roles,
      organization: (user as any).orgMembers[0]?.organization?.displayName ?? (user as any).orgMembers[0]?.organization?.legalName ?? null,
    };
  }

  async updateStatus(actorId: string, targetId: string, status: string, reason?: string) {
    if (actorId === targetId) throw new BadRequestException("Cannot change your own status");
    const allowed = ["ACTIVE", "SUSPENDED", "DEACTIVATED"];
    if (!allowed.includes(status)) throw new BadRequestException(`Invalid status: ${status}`);

    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException("User not found");

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { status: status as any },
    });

    await this.prisma.notification.create({
      data: {
        userId: targetId,
        channel: "IN_APP",
        type: "SYSTEM",
        title: `Account ${status.toLowerCase()}`,
        body: reason ? `Reason: ${reason}` : `Your account status was changed to ${status}.`,
        status: "SENT",
        sentAt: new Date(),
      },
    });

    return updated;
  }

  async setRoles(actorId: string, targetId: string, roles: string[]) {
    if (actorId === targetId) throw new BadRequestException("Cannot change your own roles");
    const allowed = ["CUSTOMER", "DRIVER", "PARTNER_ADMIN", "PARTNER_STAFF", "AGENCY_ADMIN", "SUPPORT", "FINANCE", "OPERATIONS", "CONTENT", "ADMIN", "SUPER_ADMIN"];
    for (const r of roles) {
      if (!allowed.includes(r)) throw new BadRequestException(`Invalid role: ${r}`);
    }

    const org = await this.prisma.organization.findFirst({ where: { legalName: "Kemraa" } });
    if (!org) throw new BadRequestException("No default organization configured");

    await this.prisma.organizationMember.deleteMany({ where: { userId: targetId } });

    for (const role of roles) {
      await this.prisma.organizationMember.create({
        data: {
          userId: targetId,
          organizationId: org.id,
          role: role as any,
        },
      });
    }

    return { roles };
  }
}