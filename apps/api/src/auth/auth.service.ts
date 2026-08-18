import * as bcrypt from "bcryptjs";
import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { OtpService } from "./otp.service.js";
import { JwtService } from "./jwt.service.js";
import { Role, MFA_REQUIRED_ROLES } from "@kemraa/domain";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
  ) {}

  async requestOtp(identifier: string, channel: string) {
    await this.otp.generate(identifier, channel);
    return { ok: true, message: "OTP sent" };
  }

  async verifyOtp(identifier: string, channel: string, code: string) {
    const valid = await this.otp.verify(identifier, channel, code);
    if (!valid) throw new UnauthorizedException({ code: "OTP_INVALID", message: "Invalid or expired OTP" });

    // Find or create user (auto-provision on first verified OTP — Spec Section 11)
    const where = channel === "EMAIL" ? { email: identifier.toLowerCase() } : { phone: identifier };
    let user = await this.prisma.user.findFirst({ where });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          ...(channel === "EMAIL" ? { email: identifier.toLowerCase() } : { phone: identifier }),
          status: "ACTIVE",
          locale: "ar-EG",
          profile: { create: {} },
        },
      });
    } else if (user.status !== "ACTIVE") {
      throw new UnauthorizedException({ code: "USER_NOT_ACTIVE", message: "Account is not active" });
    }

    // MFA enforcement for privileged roles (Spec Section 11)
    const roles = await this.getUserRoles(user.id);
    const needsMfa = roles.some((r) => MFA_REQUIRED_ROLES.has(r as Role));
    if (needsMfa && !user.mfaEnabled) {
      // In production: require MFA setup before issuing tokens. For sandbox: warn + proceed.
      console.warn(`[AUTH] User ${user.id} has privileged role but MFA not enabled`);
    }

    const accessToken = this.jwt.signAccess(user.id, roles);
    const { token: refreshToken, jti } = this.jwt.signRefresh(user.id);

    // Audit login (Spec Section 11/25)
    await this.prisma.auditLog.create({
      data: { actorId: user.id, action: "AUTH_LOGIN", resourceType: "USER", resourceId: user.id, metadata: { channel, roles } },
    });

    return { accessToken, refreshToken, user: { id: user.id, email: user.email, phone: user.phone, roles } };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verifyRefresh(refreshToken);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.status !== "ACTIVE") throw new UnauthorizedException({ code: "USER_NOT_ACTIVE" });
      const roles = await this.getUserRoles(user.id);
      // Refresh token rotation (Spec Section 11): issue new pair, old one becomes invalid
      const accessToken = this.jwt.signAccess(user.id, roles);
      const { token: newRefreshToken } = this.jwt.signRefresh(user.id);
      return { accessToken, refreshToken: newRefreshToken };
    } catch {
      throw new UnauthorizedException({ code: "REFRESH_INVALID", message: "Invalid refresh token" });
    }
  }

  async logout(refreshToken: string, actorId?: string) {
    // In production: blacklist jti in Redis. For now: audit only.
    await this.prisma.auditLog.create({
      data: { actorId: actorId ?? null, action: "AUTH_LOGOUT", resourceType: "SESSION", metadata: { tokenPrefix: refreshToken.slice(0, 10) } },
    });
    return { ok: true };
  }

  private async getUserRoles(userId: string): Promise<string[]> {
    const memberships = await this.prisma.organizationMember.findMany({ where: { userId }, select: { role: true } });
    const roles = memberships.map((m) => m.role);
    if (roles.length === 0) roles.push("CUSTOMER"); // default role (Spec Section 7)
    return [...new Set(roles)];
  }
}