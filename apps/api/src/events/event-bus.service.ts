import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { randomUUID } from "node:crypto";
import { DomainEvent, EventType, EVENT_NOTIFICATION_DEFAULTS } from "./event-catalog.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { NotificationStatus } from "@prisma/client";

@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private connection: Redis;
  private eventQueue: Queue;
  private notificationWorker: Worker;

  constructor(private readonly prisma: PrismaService) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  }

  async onModuleInit() {
    // Create event queue
    this.eventQueue = new Queue("events", { connection: this.connection });
    
    // Create notification worker
    this.notificationWorker = new Worker(
      "notifications",
      async (job: Job) => {
        return this.processNotification(job);
      },
      { connection: this.connection, concurrency: 5 }
    );

    this.notificationWorker.on("completed", (job) => {
      this.logger.log(`Notification job ${job.id} completed`);
    });

    this.notificationWorker.on("failed", (job, err) => {
      this.logger.error(`Notification job ${job?.id} failed: ${err.message}`);
    });

    this.logger.log("EventBus initialized with notification worker");
  }

  async onModuleDestroy() {
    await this.eventQueue.close();
    await this.notificationWorker.close();
    await this.connection.quit();
  }

  /**
   * Emit a domain event
   */
  async emit<T>(type: EventType, payload: T, options?: {
    actor?: string;
    correlationId?: string;
    source?: string;
  }): Promise<string> {
    const eventId = `evt_${randomUUID()}`;
    const event: DomainEvent<T> = {
      eventId,
      type,
      version: "1.0",
      timestamp: new Date(),
      source: options?.source || "api",
      actor: options?.actor,
      correlationId: options?.correlationId,
      payload,
    };

    // Add to event queue
    await this.eventQueue.add("event", event, {
      jobId: eventId,
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    this.logger.log(`Event emitted: ${type} (${eventId})`);

    // Auto-trigger notifications based on event type
    const channels = EVENT_NOTIFICATION_DEFAULTS[type] || [];
    if (channels.length > 0) {
      await this.triggerNotifications(event, channels);
    }

    return eventId;
  }

  /**
   * Trigger notifications for an event
   */
  private async triggerNotifications(event: DomainEvent, channels: string[]) {
    const notificationQueue = new Queue("notifications", { connection: this.connection });
    
    for (const channel of channels) {
      await notificationQueue.add(
        channel,
        { event, channel },
        {
          jobId: `notif_${event.eventId}_${channel}`,
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
        }
      );
    }

    await notificationQueue.close();
  }

  /**
   * Process notification job
   */
  private async processNotification(job: Job): Promise<void> {
    const { event, channel } = job.data;

    this.logger.log(`Processing ${channel} notification for ${event.type}`);

    // Create notification record in DB
    const userId = event.payload.userId || event.payload.travelerId;
    if (!userId) {
      this.logger.warn(`No userId in event payload for ${event.type}`);
      return;
    }

    // Generate notification content based on event type
    const { title, body } = this.generateNotificationContent(event);

    await this.prisma.notification.create({
      data: {
        userId,
        channel,
        type: event.type,
        title,
        body,
        status: NotificationStatus.QUEUED,
      },
    });

    // TODO: Send via actual channel provider (push/email/sms)
    // For now, just mark as SENT
    this.logger.log(`Notification created: ${channel} -> ${userId} (${event.type})`);
  }

  /**
   * Generate notification content from event
   */
  private generateNotificationContent(event: DomainEvent): { title: string; body: string } {
    const templates: Record<string, { title: string; body: string }> = {
      BOOKING_CONFIRMED: {
        title: "Booking Confirmed ✅",
        body: `Your booking ${event.payload.bookingId?.slice(0, 8)} has been confirmed`,
      },
      PAYMENT_AUTHORIZED: {
        title: "Payment Authorized",
        body: `Payment of ${(event.payload.amountMinor / 100).toFixed(2)} ${event.payload.currency} authorized`,
      },
      PAYMENT_FAILED: {
        title: "Payment Failed ⚠️",
        body: "Your payment could not be processed. Please try again.",
      },
      DRIVER_ASSIGNED: {
        title: "Driver Assigned 🚗",
        body: "Your driver is on the way!",
      },
      DRIVER_ARRIVED: {
        title: "Driver Arrived",
        body: "Your driver has arrived at the pickup location",
      },
      FLIGHT_DELAYED: {
        title: "Flight Delayed ⏰",
        body: `Your flight has been delayed. New departure: ${event.payload.newDepartureTime || "TBD"}`,
      },
      REFUND_ISSUED: {
        title: "Refund Issued 💰",
        body: `Refund of ${(event.payload.amountMinor / 100).toFixed(2)} ${event.payload.currency} has been processed`,
      },
      BOOKING_CANCELLED: {
        title: "Booking Cancelled",
        body: `Your booking ${event.payload.bookingId?.slice(0, 8)} has been cancelled`,
      },
      EMERGENCY: {
        title: "🚨 Emergency Alert",
        body: event.payload.message || "Emergency situation reported",
      },
    };

    return templates[event.type] || {
      title: `Event: ${event.type}`,
      body: "You have a new notification",
    };
  }

  /**
   * Get event queue stats
   */
  async getStats() {
    const eventCounts = await this.eventQueue.getJobCounts();
    const notifQueue = new Queue("notifications", { connection: this.connection });
    const notifCounts = await notifQueue.getJobCounts();
    await notifQueue.close();

    return {
      events: eventCounts,
      notifications: notifCounts,
    };
  }
}
