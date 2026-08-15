import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, filter?: { unreadOnly?: boolean; type?: string }) {
    const where: any = { userId };
    if (filter?.unreadOnly) where.readAt = null;
    if (filter?.type) where.type = filter.type;

    const items = await this.prisma.notification.findMany({
      where,
      orderBy: { sentAt: "desc" },
      take: 100,
    });
    return { items, total: items.length };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  // Admin endpoints
  async adminList(filter?: { type?: string; userId?: string }) {
    const where: any = {};
    if (filter?.type) where.type = filter.type;
    if (filter?.userId) where.userId = filter.userId;

    const items = await this.prisma.notification.findMany({
      where,
      orderBy: { sentAt: "desc" },
      take: 200,
      include: {
        user: {
          select: {
            email: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    return items;
  }

  async create(data: {
    userId: string;
    channel: string;
    type: string;
    title: string;
    body: string;
  }) {
    return this.prisma.notification.create({
      data: {
        ...data,
        status: "SENT",
        sentAt: new Date(),
      },
    });
  }
}