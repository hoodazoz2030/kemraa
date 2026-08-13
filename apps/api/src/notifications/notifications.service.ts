import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { Prisma } from "@prisma/client";
import { Queue } from "bullmq";
import { createQueue } from "./redis.connection.js";
import { SendNotificationDto, UpdatePreferencesDto, ListNotificationsQueryDto } from "./dto/notifications.dto.js";
import { randomUUID } from "node:crypto";

@Injectable()
export class NotificationsService {
  private emailQueue: Queue;
  private smsQueue: Queue;
  private pushQueue: Queue;

  constructor(private readonly prisma: PrismaService) {
    this.emailQueue = createQueue("notifications-email");
    this.smsQueue = createQueue("notifications-sms");
    this.pushQueue = createQueue("notifications-push");
  }

  async send(dto: SendNotificationDto) {
    const notificationId = randomUUID();
    const data = {
      id: notificationId,
      recipientId: dto.recipientId,
      channel: dto.channel,
      title: dto.title,
      body: dto.body,
      metadata: dto.metadata ?? {},
      status: "QUEUED",
      createdAt: new Date(),
    };

    // Persist to DB
    await this.prisma.notification.create({
      data: {
        id: notificationId,
        userId: dto.recipientId,
        type: dto.channel,
        channel: dto.channel,
        title: dto.title,
        body: dto.body,
        status: "QUEUED",
        
      },
    });

    // Enqueue to BullMQ
    const queue = this.getQueue(dto.channel);
    if (queue) {
      const jobOptions = dto.delaySeconds ? { delay: dto.delaySeconds * 1000 } : {};
      await queue.add("send", data, jobOptions).catch((e) => {
        console.warn("[NOTIF] Queue failed (Redis down?), will mark as QUEUED only:", e.message);
      });
    } else {
      console.warn("[NOTIF] Unknown channel:", dto.channel);
    }

    return data;
  }

  async list(userId: string, query: ListNotificationsQueryDto) {
    const where: any = { userId };
    if (query.channel) where.channel = query.channel;
    if (query.status) where.status = query.status;
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { id: "desc" },
        take: Math.min(query.limit ?? 50, 200),
        skip: query.offset ?? 0,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { items, total, limit: query.limit ?? 50, offset: query.offset ?? 0 };
  }

  async getOne(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification) throw new NotFoundException({ code: "NOTIFICATION_NOT_FOUND" });
    if (notification.userId !== userId) throw new ForbiddenException({ code: "FORBIDDEN" });
    return notification;
  }

  async markRead(userId: string, notificationId: string) {
    await this.getOne(userId, notificationId);
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: "SENT" },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, status: "QUEUED" },
      data: { status: "SENT" },
    });
    return { ok: true };
  }

  async getPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { locale: true, timezone: true },
    });
    if (!user) throw new NotFoundException({ code: "USER_NOT_FOUND" });
    return {
      userId,
      locale: user.locale,
      timezone: user.timezone,
      channels: {
        EMAIL: true,
        SMS: true,
        PUSH: true,
        IN_APP: true,
      },
    };
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    // For now, just return the preferences (would store in UserProfile.metadata)
    return { userId, preferences: dto };
  }

  private getQueue(channel: string): Queue | null {
    switch (channel) {
      case "EMAIL": return this.emailQueue;
      case "SMS": return this.smsQueue;
      case "PUSH": return this.pushQueue;
      default: return null;
    }
  }
}