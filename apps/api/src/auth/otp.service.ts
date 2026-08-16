import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Queue } from "bullmq";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../redis/redis.module.js";
import { EMAIL_QUEUE } from "../queues/queues.module.js";
import { AppConfig } from "../config/app.config.js";
import { APP_CONFIG } from "../config/config.module.js";

interface StoredOtp { code: string; attempts: number; }

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly fallback = new Map<string, StoredOtp & { expiresAt: number }>();

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(EMAIL_QUEUE) private readonly emailQueue: Queue,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  private key(identifier: string, channel: string): string {
    return "otp:" + channel + ":" + identifier.toLowerCase();
  }

  async generate(identifier: string, channel: string): Promise<string> {
    const code = this.config.nodeEnv === "production"
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : "123456";
    const ttl = this.config.otpTtlSeconds;
    const key = this.key(identifier, channel);

    try {
      await this.redis.set(key, JSON.stringify({ code, attempts: 0 }), "EX", ttl);
      this.logger.log("[OTP] stored in Redis: " + key);
    } catch (e) {
      this.logger.warn("[OTP] Redis down, memory fallback: " + (e as Error).message);
      this.fallback.set(key, { code, attempts: 0, expiresAt: Date.now() + ttl * 1000 });
    }

    if (channel === "EMAIL" && identifier.includes("@")) {
      try {
        await this.emailQueue.add(
          "send-otp",
          { email: identifier, code, ttl },
          { attempts: 3, backoff: { type: "exponential", delay: 2000 } },
        );
        this.logger.log("[OTP] email queued for " + identifier);
      } catch (e) {
        this.logger.warn("[OTP] queue down, console fallback: " + (e as Error).message);
        this.logger.log("[OTP][CONSOLE] " + identifier + " -> " + code);
      }
    } else {
      this.logger.log("[OTP][" + channel + "] " + identifier + " -> " + code);
    }

    return code;
  }

  async verify(identifier: string, channel: string, code: string): Promise<boolean> {
    const key = this.key(identifier, channel);
    try {
      const raw = await this.redis.get(key);
      if (!raw) return this.verifyFallback(key, code);
      const entry = JSON.parse(raw) as StoredOtp;
      if (entry.attempts >= 5) { await this.redis.del(key); return false; }
      entry.attempts++;
      if (entry.code !== code) {
        const ttl = await this.redis.ttl(key);
        await this.redis.set(key, JSON.stringify(entry), "EX", ttl > 0 ? ttl : 60);
        return false;
      }
      await this.redis.del(key);
      this.logger.log("[OTP] verified: " + identifier);
      return true;
    } catch {
      return this.verifyFallback(key, code);
    }
  }

  private verifyFallback(key: string, code: string): boolean {
    const entry = this.fallback.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) { this.fallback.delete(key); return false; }
    if (entry.attempts >= 5) { this.fallback.delete(key); return false; }
    entry.attempts++;
    if (entry.code !== code) return false;
    this.fallback.delete(key);
    return true;
  }
}
