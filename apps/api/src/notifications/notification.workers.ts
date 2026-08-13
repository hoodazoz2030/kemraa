import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Worker, Job } from "bullmq";
import { createWorker } from "./redis.connection.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class NotificationWorkers implements OnModuleInit, OnModuleDestroy {
  private workers: Worker[] = [];

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.workers = [
      createWorker("notifications-email", (job: Job) => this.processEmail(job)),
      createWorker("notifications-sms", (job: Job) => this.processSms(job)),
      createWorker("notifications-push", (job: Job) => this.processPush(job)),
    ];
    console.log("[WORKERS] Notification workers started (email, sms, push)");
  }

  onModuleDestroy() {
    Promise.all(this.workers.map((w) => w.close())).catch(() => {});
  }

  private async processEmail(job: Job) {
    const { id, recipientId, title, body, metadata } = job.data;
    console.log(`[EMAIL] Sending to ${recipientId}: ${title}`);
    // In production: call SendGrid/Mailgun API
    // For sandbox: log + mark as SENT
    await this.prisma.notification.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    }).catch(() => {});
    return { ok: true, channel: "EMAIL" };
  }

  private async processSms(job: Job) {
    const { id, recipientId, title, body } = job.data;
    console.log(`[SMS] Sending to ${recipientId}: ${body}`);
    // In production: call Twilio/MessageBird API
    await this.prisma.notification.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    }).catch(() => {});
    return { ok: true, channel: "SMS" };
  }

  private async processPush(job: Job) {
    const { id, recipientId, title, body } = job.data;
    console.log(`[PUSH] Sending to ${recipientId}: ${title}`);
    // In production: call Firebase Cloud Messaging
    await this.prisma.notification.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    }).catch(() => {});
    return { ok: true, channel: "PUSH" };
  }
}