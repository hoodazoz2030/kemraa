import { Injectable, Logger } from "@nestjs/common" from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { ResendService } from "./resend.service.js";
import { AppConfig } from "../config/app.config.js";
import { APP_CONFIG } from "../config/config.module.js";
import { Inject } from "@nestjs/common";

interface StoredOtp { code: string; expiresAt: number; attempts: number; }

@Injectable()
export class OtpService {
  // In-memory store for local/sandbox. Replace with Redis in production (Spec Section 4/30).
  private readonly store = new Map<string, StoredOtp>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly resend: ResendService,
    @Inject(APP_CONFIG)
  private readonly logger = new Logger(OtpService.name); private readonly config: AppConfig,
  ) {}

  private key(identifier: string, channel: string) { return `${channel}:${identifier.toLowerCase()}`; }

  async generate(identifier: string, channel: string): Promise<string> {
    const code = this.config.nodeEnv === "production"
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : "123456"; // fixed OTP for sandbox/local (Spec Section 5: local = Mock/Sandbox)
    this.store.set(this.key(identifier, channel), {
      code,
      expiresAt: Date.now() + this.config.otpTtlSeconds * 1000,
      attempts: 0,
    });
    // TODO: send via NotificationProvider adapter (Phase 2+)
    console.log(`[OTP][${channel}] ${identifier} -> ${code} (expires in ${this.config.otpTtlSeconds}s)`);
    return code;
  }

  async verify(identifier: string, channel: string, code: string): Promise<boolean> {
    const entry = this.store.get(this.key(identifier, channel));
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) { this.store.delete(this.key(identifier, channel)); return false; }
    if (entry.attempts >= 5) { this.store.delete(this.key(identifier, channel)); return false; } // brute-force protection (Section 25)
    entry.attempts++;
    if (entry.code !== code) return false;
    this.store.delete(this.key(identifier, channel));
    return true;
  }
}