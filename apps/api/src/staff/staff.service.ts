import { Injectable, UnauthorizedException, BadRequestException, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { JwtService } from "../auth/jwt.service.js";
import { REDIS_CLIENT } from "../redis/redis.module.js";
import { EMAIL_QUEUE } from "../queues/queues.module.js";
import type Redis from "ioredis";
import type { Queue } from "bullmq";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(EMAIL_QUEUE) private readonly emailQueue: Queue,
  ) {}

  private fingerprint(deviceId: string, ua: string): string {
    return crypto.createHash("sha256").update(deviceId + "|" + ua).digest("hex").slice(0, 16);
  }

  // Step 1: check device + auto-send OTP if new device
  async checkDevice(email: string, deviceId: string, ua: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.accountType !== "STAFF" || user.status !== "ACTIVE") {
      return { needsOtp: true, sent: false };
    }
    const fp = this.fingerprint(deviceId, ua);
    const trusted = await this.prisma.trustedDevice.findUnique({
      where: { userId_deviceFingerprint: { userId: user.id, deviceFingerprint: fp } },
    });
    if (trusted) return { needsOtp: false, sent: false };

    // New device: generate + send OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const key = "otp:EMAIL:" + email.toLowerCase();
    await this.redis.set(key, JSON.stringify({ code, attempts: 0 }), "EX", 600);
    await this.emailQueue.add("send-otp", { email: email.toLowerCase(), code, ttl: 600 }, { attempts: 3 });
    return { needsOtp: true, sent: true };
  }

  // Step 2: verify OTP -> preToken + trust device
  async verifyOtp(email: string, code: string, deviceId: string, deviceName: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) throw new UnauthorizedException({ code: "OTP_INVALID" });
    const key = "otp:EMAIL:" + email.toLowerCase();
    const raw = await this.redis.get(key);
    if (!raw) throw new UnauthorizedException({ code: "OTP_EXPIRED" });
    const stored = JSON.parse(raw);
    if (stored.code !== code) throw new UnauthorizedException({ code: "OTP_INVALID" });
    await this.redis.del(key);

    const fp = this.fingerprint(deviceId, deviceName);
    await this.prisma.trustedDevice.upsert({
      where: { userId_deviceFingerprint: { userId: user.id, deviceFingerprint: fp } },
      update: { lastSeenAt: new Date(), deviceName },
      create: { userId: user.id, deviceFingerprint: fp, deviceName },
    });

    const preToken = this.jwt.signAccess(user.id, ["PREAUTH"]);
    return { preToken, userId: user.id };
  }

  // Step 3: username + password (+ preToken or trusted device)
  async login(username: string, password: string, deviceId: string, ua: string, preToken?: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !user.passwordHash || user.accountType !== "STAFF" || user.status !== "ACTIVE") {
      throw new UnauthorizedException({ code: "INVALID_CREDENTIALS" });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException({ code: "INVALID_CREDENTIALS" });

    const fp = this.fingerprint(deviceId, ua);
    const trusted = await this.prisma.trustedDevice.findUnique({
      where: { userId_deviceFingerprint: { userId: user.id, deviceFingerprint: fp } },
    });

    if (!trusted) {
      // Must have valid preToken (OTP was verified)
      if (!preToken) throw new UnauthorizedException({ code: "OTP_REQUIRED" });
      try {
        const payload: any = this.jwt.verifyAccess(preToken);
        if (payload.sub !== user.id) throw new Error("mismatch");
      } catch {
        throw new UnauthorizedException({ code: "OTP_REQUIRED" });
      }
      await this.prisma.trustedDevice.upsert({
        where: { userId_deviceFingerprint: { userId: user.id, deviceFingerprint: fp } },
        update: { lastSeenAt: new Date(), deviceName: ua.slice(0, 100) },
        create: { userId: user.id, deviceFingerprint: fp, deviceName: ua.slice(0, 100) },
      });
    } else {
      await this.prisma.trustedDevice.update({ where: { id: trusted.id }, data: { lastSeenAt: new Date() } });
    }

    const memberships = await this.prisma.organizationMember.findMany({ where: { userId: user.id } });
    const roles = memberships.map((m) => m.role);
    if (roles.length === 0) roles.push("ADMIN");

    const accessToken = this.jwt.signAccess(user.id, roles);
    const { token: refreshToken } = this.jwt.signRefresh(user.id);

    await this.prisma.auditLog.create({
      data: { actorId: user.id, action: "STAFF_LOGIN", resourceType: "USER", resourceId: user.id, metadata: { trusted: !!trusted } },
    });

    return {
      accessToken, refreshToken,
      user: {
        id: user.id, username: user.username, email: user.email, roles,
        features: (user.features as string[]) ?? [],
        avatarUrl: null,
      },
    };
  }

  // ===== SUPER_ADMIN: Staff management =====
  async createStaff(data: { username: string; password: string; email: string; fullName?: string; features?: string[]; avatarUrl?: string }) {
    if (await this.prisma.user.findUnique({ where: { username: data.username } })) throw new BadRequestException({ code: "USERNAME_TAKEN" });
    if (await this.prisma.user.findUnique({ where: { email: data.email.toLowerCase() } })) throw new BadRequestException({ code: "EMAIL_TAKEN" });

    const hash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(), username: data.username, passwordHash: hash,
        accountType: "STAFF", status: "ACTIVE", locale: "ar-EG", timezone: "Africa/Cairo",
        features: data.features ?? ["dashboard", "bookings", "notifications", "support"],
        profile: {
          create: {
            firstName: data.fullName?.split(" ")[0] ?? "",
            lastName: data.fullName?.split(" ").slice(1).join(" ") ?? "",
            avatarUrl: data.avatarUrl ?? null,
          },
        },
      },
    });
    const org = await this.prisma.organization.findFirst({ where: { legalName: "Kemraa" } });
    if (org) await this.prisma.organizationMember.create({ data: { organizationId: org.id, userId: user.id, role: "ADMIN" } });
    await this.prisma.auditLog.create({ data: { action: "STAFF_CREATE", resourceType: "USER", resourceId: user.id, metadata: { username: data.username } } });
    return { id: user.id, username: user.username, email: user.email };
  }

  async listStaff() {
    return this.prisma.user.findMany({
      where: { accountType: "STAFF" },
      select: {
        id: true, username: true, email: true, status: true, createdAt: true, features: true,
        profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
        orgMembers: { select: { role: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStaff(id: string, data: { status?: string; role?: string; password?: string; features?: string[]; avatarUrl?: string; fullName?: string }) {
    const updates: any = {};
    if (data.status) updates.status = data.status;
    if (data.password) updates.passwordHash = await bcrypt.hash(data.password, 10);
    if (data.features) updates.features = data.features;
    if (Object.keys(updates).length > 0) await this.prisma.user.update({ where: { id }, data: updates });

    const profileUpdates: any = {};
    if (data.avatarUrl !== undefined) profileUpdates.avatarUrl = data.avatarUrl;
    if (data.fullName !== undefined) {
      profileUpdates.firstName = data.fullName.split(" ")[0] ?? "";
      profileUpdates.lastName = data.fullName.split(" ").slice(1).join(" ") ?? "";
    }
    if (Object.keys(profileUpdates).length > 0) {
      await this.prisma.user.update({ where: { id }, data: { profile: { update: profileUpdates } } });
    }
    if (data.role) {
      const org = await this.prisma.organization.findFirst({ where: { legalName: "Kemraa" } });
      if (org) await this.prisma.organizationMember.updateMany({ where: { userId: id, organizationId: org.id }, data: { role: data.role as any } });
    }
    await this.prisma.auditLog.create({ data: { action: "STAFF_UPDATE", resourceType: "USER", resourceId: id, metadata: { keys: Object.keys(data) } } });
    return { ok: true };
  }

  async deleteStaff(id: string) {
    await this.prisma.user.update({ where: { id }, data: { status: "SUSPENDED" as any } });
    await this.prisma.trustedDevice.deleteMany({ where: { userId: id } });
    await this.prisma.auditLog.create({ data: { action: "STAFF_DELETE", resourceType: "USER", resourceId: id } });
    return { ok: true };
  }
}
