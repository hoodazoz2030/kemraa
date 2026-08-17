import { Injectable, UnauthorizedException, BadRequestException, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { JwtService } from "../auth/jwt.service.js";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../redis/redis.module.js";
import * as crypto from "crypto";

@Injectable()
export class StaffService {
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCK_MINUTES = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // Generate random code: krt + 5 random digits
  private generateCode(): string {
    const digits = Math.floor(10000 + Math.random() * 90000).toString();
    return "krt" + digits;
  }

  private deviceFingerprint(deviceId: string, ua: string): string {
    return crypto.createHash("sha256").update(deviceId + "|" + ua).digest("hex").slice(0, 16);
  }

  // ===== SINGLE-FIELD LOGIN: access code only =====
  async accessLogin(code: string, deviceId: string, ua: string) {
    if (!code || code.trim().length < 3) {
      throw new UnauthorizedException({ code: "INVALID_CODE" });
    }
    const normalized = code.trim();
    const ip = ua.slice(0, 100);

    const user = await this.prisma.user.findUnique({ where: { accessCode: normalized }, include: { profile: true } });
    if (!user || user.accountType !== "STAFF") {
      // Audit failed attempt (no user found)
      await this.prisma.auditLog.create({
        data: { action: "ACCESS_LOGIN_FAILED", resourceType: "USER", metadata: { attemptedCode: normalized.slice(0, 4) + "...", reason: "code_not_found" } },
      });
      throw new UnauthorizedException({ code: "INVALID_CODE", message: "Invalid access code" });
    }
    if (user.status !== "ACTIVE") {
      await this.prisma.auditLog.create({
        data: { actorId: user.id, action: "ACCESS_LOGIN_FAILED", resourceType: "USER", metadata: { reason: "account_suspended" } },
      });
      throw new UnauthorizedException({ code: "ACCOUNT_SUSPENDED", message: "Account is suspended" });
    }

    // Check lock
    if (user.accessCodeLockedUntil && new Date(user.accessCodeLockedUntil) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.accessCodeLockedUntil).getTime() - Date.now()) / 60000);
      throw new UnauthorizedException({
        code: "CODE_LOCKED",
        message: `Too many attempts. Try again in ${minutesLeft} minute(s).`,
      });
    }

    // Code matched! Reset attempts + trust device
    await this.prisma.user.update({
      where: { id: user.id },
      data: { accessCodeAttempts: 0, accessCodeLockedUntil: null },
    });

    const fp = this.deviceFingerprint(deviceId, ua);
    await this.prisma.trustedDevice.upsert({
      where: { userId_deviceFingerprint: { userId: user.id, deviceFingerprint: fp } },
      update: { lastSeenAt: new Date(), deviceName: ua.slice(0, 100) },
      create: { userId: user.id, deviceFingerprint: fp, deviceName: ua.slice(0, 100) },
    });

    const memberships = await this.prisma.organizationMember.findMany({ where: { userId: user.id } });
    const roles = memberships.map((m) => m.role);
    if (roles.length === 0) roles.push("ADMIN");

    const accessToken = this.jwt.signAccess(user.id, roles);
    const { token: refreshToken } = this.jwt.signRefresh(user.id);

    await this.prisma.auditLog.create({
      data: { actorId: user.id, action: "ACCESS_LOGIN", resourceType: "USER", resourceId: user.id, metadata: { codePrefix: normalized.slice(0, 5) + "...", device: fp } },
    });

    return {
      accessToken, refreshToken,
      user: {
        id: user.id, email: user.email, roles,
        username: user.username,
        features: (user.features as string[]) ?? [],
        profile: user.profile ? {
          firstName: (user.profile as any).firstName,
          lastName: (user.profile as any).lastName,
          avatarUrl: (user.profile as any).avatarUrl,
        } : null,
      },
    };
  }

  // ===== SUPER_ADMIN: Staff management =====
  async createStaff(data: { fullName?: string; email?: string; features?: string[]; avatarUrl?: string }) {
    // Generate unique code (retry if collision)
    let code = "";
    for (let i = 0; i < 10; i++) {
      code = this.generateCode();
      const exists = await this.prisma.user.findUnique({ where: { accessCode: code } });
      if (!exists) break;
    }
    const emailExists = data.email ? await this.prisma.user.findUnique({ where: { email: data.email.toLowerCase() } }) : null;
    if (emailExists) throw new BadRequestException({ code: "EMAIL_TAKEN" });

    const user = await this.prisma.user.create({
      data: {
        email: data.email?.toLowerCase() ?? null,
        accessCode: code,
        accountType: "STAFF",
        status: "ACTIVE",
        locale: "ar-EG",
        timezone: "Africa/Cairo",
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
    await this.prisma.auditLog.create({ data: { action: "STAFF_CREATE", resourceType: "USER", resourceId: user.id, metadata: { code } } });
    return { id: user.id, accessCode: code };
  }

  async listStaff() {
    return this.prisma.user.findMany({
      where: { accountType: "STAFF" },
      select: {
        id: true, username: true, email: true, accessCode: true, status: true, createdAt: true, features: true,
        accessCodeLockedUntil: true, accessCodeAttempts: true,
        profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
        orgMembers: { select: { role: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async regenerateCode(id: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BadRequestException("User not found");
    let newCode = "";
    for (let i = 0; i < 10; i++) {
      newCode = this.generateCode();
      const exists = await this.prisma.user.findUnique({ where: { accessCode: newCode } });
      if (!exists) break;
    }
    await this.prisma.user.update({
      where: { id },
      data: { accessCode: newCode, accessCodeAttempts: 0, accessCodeLockedUntil: null },
    });
    await this.prisma.auditLog.create({ data: { action: "STAFF_CODE_REGEN", resourceType: "USER", resourceId: id } });
    // Invalidate all trusted devices for this user (old code no longer valid anyway, but clean slate)
    await this.prisma.trustedDevice.deleteMany({ where: { userId: id } });
    return newCode;
  }

  async toggleLock(id: string, suspended: boolean) {
    await this.prisma.user.update({
      where: { id },
      data: {
        status: suspended ? ("SUSPENDED" as any) : "ACTIVE",
        accessCodeAttempts: 0,
        accessCodeLockedUntil: null,
      },
    });
    await this.prisma.auditLog.create({ data: { action: suspended ? "STAFF_SUSPEND" : "STAFF_REACTIVATE", resourceType: "USER", resourceId: id } });
    return { ok: true };
  }

  async updateStaff(id: string, data: { features?: string[]; fullName?: string; avatarUrl?: string; role?: string }) {
    const updates: any = {};
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
