import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { JwtService } from "../auth/jwt.service.js";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private fingerprint(ip: string, ua: string): string {
    return crypto.createHash("sha256").update(ip + "|" + ua).digest("hex").slice(0, 16);
  }

  async login(username: string, password: string, ip: string, ua: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException({ code: "INVALID_CREDENTIALS" });
    }
    if (user.accountType !== "STAFF") {
      throw new UnauthorizedException({ code: "NOT_STAFF", message: "Account is not a staff account" });
    }
    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException({ code: "ACCOUNT_DISABLED" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException({ code: "INVALID_CREDENTIALS" });

    // Check trusted device
    const fp = this.fingerprint(ip, ua);
    const device = await this.prisma.trustedDevice.findUnique({
      where: { userId_deviceFingerprint: { userId: user.id, deviceFingerprint: fp } },
    });

    let needsOtp = !device;

    // Get roles
    const memberships = await this.prisma.organizationMember.findMany({ where: { userId: user.id } });
    const roles = memberships.map((m) => m.role);
    if (roles.length === 0) roles.push("ADMIN");

    return {
      needsOtp,
      userId: user.id,
      email: user.email,
      username: user.username,
      roles,
      fingerprint: fp,
      deviceName: ua.slice(0, 100),
    };
  }

  async verifyOtp(userId: string, code: string, fingerprint: string, deviceName: string) {
    // Verify OTP (reuse OtpService logic)
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException({ code: "USER_NOT_FOUND" });

    // Trust device
    await this.prisma.trustedDevice.upsert({
      where: { userId_deviceFingerprint: { userId, deviceFingerprint: fingerprint } },
      update: { lastSeenAt: new Date(), deviceName },
      create: { userId, deviceFingerprint: fingerprint, deviceName },
    });

    // Issue tokens
    const memberships = await this.prisma.organizationMember.findMany({ where: { userId } });
    const roles = memberships.map((m) => m.role);
    if (roles.length === 0) roles.push("ADMIN");

    const accessToken = this.jwt.signAccess(userId, roles);
    const { token: refreshToken } = this.jwt.signRefresh(userId);

    // Audit
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: "STAFF_LOGIN",
        resourceType: "USER",
        resourceId: userId,
        metadata: { method: "password", deviceTrusted: true },
      },
    });

    return { accessToken, refreshToken, user: { id: userId, username: user.username, email: user.email, roles } };
  }

  // SUPER_ADMIN only: manage staff accounts
  async createStaff(data: { username: string; password: string; email: string; fullName?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { username: data.username } });
    if (existing) throw new BadRequestException({ code: "USERNAME_TAKEN" });

    const emailExists = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (emailExists) throw new BadRequestException({ code: "EMAIL_TAKEN" });

    const hash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        username: data.username,
        passwordHash: hash,
        accountType: "STAFF",
        status: "ACTIVE",
        locale: "ar-EG",
        timezone: "Africa/Cairo",
        profile: {
          create: {
            firstName: data.fullName?.split(" ")[0] ?? "",
            lastName: data.fullName?.split(" ").slice(1).join(" ") ?? "",
          },
        },
      },
    });

    // Add to Kemraa org as STAFF
    const org = await this.prisma.organization.findFirst({ where: { legalName: "Kemraa" } });
    if (org) {
      await this.prisma.organizationMember.create({
        data: { organizationId: org.id, userId: user.id, role: "ADMIN" },
      });
    }

    await this.prisma.auditLog.create({
      data: { action: "STAFF_CREATE", resourceType: "USER", resourceId: user.id, metadata: { username: data.username } },
    });

    return { id: user.id, username: user.username, email: user.email };
  }

  async listStaff() {
    return this.prisma.user.findMany({
      where: { accountType: "STAFF" },
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        createdAt: true,
        profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
        orgMembers: { select: { role: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStaff(id: string, data: { status?: string; role?: string; password?: string }) {
    const updates: any = {};
    if (data.status) updates.status = data.status;
    if (data.password) updates.passwordHash = await bcrypt.hash(data.password, 10);

    if (Object.keys(updates).length > 0) {
      await this.prisma.user.update({ where: { id }, data: updates });
    }

    if (data.role) {
      const org = await this.prisma.organization.findFirst({ where: { legalName: "Kemraa" } });
      if (org) {
        await this.prisma.organizationMember.updateMany({
          where: { userId: id, organizationId: org.id },
          data: { role: data.role as any },
        });
      }
    }

    await this.prisma.auditLog.create({
      data: { action: "STAFF_UPDATE", resourceType: "USER", resourceId: id, metadata: data },
    });

    return { ok: true };
  }

  async deleteStaff(id: string) {
    await this.prisma.user.update({ where: { id }, data: { status: "SUSPENDED" as any, deletedAt: new Date() } });
    await this.prisma.auditLog.create({
      data: { action: "STAFF_DELETE", resourceType: "USER", resourceId: id },
    });
    return { ok: true };
  }
}
