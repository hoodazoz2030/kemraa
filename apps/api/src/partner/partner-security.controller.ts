import { Controller, Post, Get, Delete, Body, Param, Req, UseGuards, HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";
import { PartnerGuard } from "../common/guards/partner.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

const SECRET = () => process.env.JWT_SECRET || "test-secret-key-12345-for-testing-only-min-32-chars";

// ===== Pure TOTP (no external dependency) =====
function base32Encode(buf: Buffer): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0, output = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += chars[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += chars[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(str: string): Buffer {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = str.toUpperCase().replace(/=+$/, "");
  let bits = 0, value = 0, idx = 0;
  const output = new Uint8Array(Math.ceil(clean.length * 5 / 8));
  for (const c of clean) {
    const v = chars.indexOf(c);
    if (v === -1) continue;
    value = (value << 5) | v;
    bits += 5;
    if (bits >= 8) {
      output[idx++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return Buffer.from(output.slice(0, idx));
}

function generateSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function totpCode(secret: string, counter: number): string {
  const buf = Buffer.alloc(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) { buf[i] = tmp & 0xff; tmp = Math.floor(tmp / 256); }
  const hmac = crypto.createHmac("sha1", base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24 | (hmac[offset + 1] & 0xff) << 16 | (hmac[offset + 2] & 0xff) << 8 | (hmac[offset + 3] & 0xff)) % 1_000_000;
  return code.toString().padStart(6, "0");
}

function verifyTotp(secret: string, token: string, window = 1): boolean {
  const t = Math.floor(Date.now() / 30000);
  for (let i = -window; i <= window; i++) {
    if (totpCode(secret, t + i) === token) return true;
  }
  return false;
}

function totpUri(email: string, secret: string): string {
  return `otpauth://totp/KEMRAA:${encodeURIComponent(email)}?secret=${secret}&issuer=KEMRAA&algorithm=SHA1&digits=6&period=30`;
}

@ApiTags("partner-security")
@Controller("partner-security")
export class PartnerSecurityController {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Forgot Password (public) =====
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgot(@Body() b: { email: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: b.email } });
    if (!user) return { ok: true };
    const token = crypto.randomBytes(32).toString("hex");
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    return { ok: true, devResetToken: token };
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @Audit("partner.password_reset", "user")
  async reset(@Body() b: { token: string; newPassword: string }) {
    const rec = await this.prisma.passwordResetToken.findUnique({ where: { token: b.token } });
    if (!rec || rec.usedAt || rec.expiresAt < new Date()) throw new BadRequestException({ code: "INVALID_TOKEN" });
    const hash = await bcrypt.hash(b.newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: rec.userId }, data: { passwordHash: hash } }),
      this.prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    ]);
    return { ok: true };
  }

  // ===== MFA (authenticated) =====
  @Get("mfa/status")
  @ApiBearerAuth()
  @UseGuards(PartnerGuard)
  async mfaStatus(@Req() req: any) {
    const mfa = await this.prisma.userMfa.findUnique({ where: { userId: req.partnerUser.userId } });
    return { enabled: mfa?.enabled ?? false };
  }

  @Post("mfa/setup")
  @ApiBearerAuth()
  @UseGuards(PartnerGuard)
  async mfaSetup(@Req() req: any) {
    const secret = generateSecret();
    await this.prisma.userMfa.upsert({
      where: { userId: req.partnerUser.userId },
      update: { secret, enabled: false },
      create: { userId: req.partnerUser.userId, secret },
    });
    const uri = totpUri(req.partnerUser.email, secret);
    return { secret, uri };
  }

  @Post("mfa/verify")
  @ApiBearerAuth()
  @UseGuards(PartnerGuard)
  @Audit("partner.mfa_enable", "user")
  async mfaVerify(@Req() req: any, @Body() b: { code: string }) {
    const mfa = await this.prisma.userMfa.findUnique({ where: { userId: req.partnerUser.userId } });
    if (!mfa) throw new BadRequestException({ code: "MFA_NOT_SETUP" });
    if (!verifyTotp(mfa.secret, b.code)) throw new BadRequestException({ code: "INVALID_CODE" });
    await this.prisma.userMfa.update({ where: { userId: req.partnerUser.userId }, data: { enabled: true } });
    return { ok: true, enabled: true };
  }

  @Post("mfa/disable")
  @ApiBearerAuth()
  @UseGuards(PartnerGuard)
  @Audit("partner.mfa_disable", "user")
  async mfaDisable(@Req() req: any, @Body() b: { code: string }) {
    const mfa = await this.prisma.userMfa.findUnique({ where: { userId: req.partnerUser.userId } });
    if (!mfa?.enabled) return { ok: true, enabled: false };
    if (!verifyTotp(mfa.secret, b.code)) throw new BadRequestException({ code: "INVALID_CODE" });
    await this.prisma.userMfa.update({ where: { userId: req.partnerUser.userId }, data: { enabled: false } });
    return { ok: true, enabled: false };
  }

  @Post("mfa/login")
  @HttpCode(HttpStatus.OK)
  async mfaLogin(@Body() b: { mfaToken: string; code: string; deviceFingerprint?: string; deviceName?: string }) {
    let payload: any;
    try { payload = jwt.verify(b.mfaToken, SECRET()); } catch { throw new BadRequestException({ code: "INVALID_MFA_TOKEN" }); }
    if (payload.scope !== "mfa") throw new BadRequestException({ code: "INVALID_MFA_TOKEN" });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { orgMembers: { include: { organization: true } }, mfa: true },
    });
    if (!user?.mfa?.enabled) throw new BadRequestException({ code: "MFA_NOT_ENABLED" });
    if (!verifyTotp(user.mfa.secret, b.code)) throw new BadRequestException({ code: "INVALID_CODE" });

    if (b.deviceFingerprint) {
      await this.prisma.trustedDevice.upsert({
        where: { userId_deviceFingerprint: { userId: user.id, deviceFingerprint: b.deviceFingerprint } },
        update: { lastSeenAt: new Date() },
        create: { userId: user.id, deviceFingerprint: b.deviceFingerprint, deviceName: b.deviceName ?? "Trusted device" },
      });
    }

    const membership = user.orgMembers?.[0];
    const org = membership?.organization;
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, roles: [user.role], accountType: user.accountType, organizationId: org?.id, organizationStatus: org?.status, orgRole: membership?.role },
      SECRET(),
      { expiresIn: "7d" },
    );
    return {
      accessToken: token,
      user: { id: user.id, email: user.email, accountType: user.accountType },
      organization: org ? { id: org.id, displayName: org.displayName, legalName: org.legalName, status: org.status, type: org.type } : null,
    };
  }

  // ===== Trusted Devices =====
  @Get("devices")
  @ApiBearerAuth()
  @UseGuards(PartnerGuard)
  async devices(@Req() req: any) {
    const items = await this.prisma.trustedDevice.findMany({ where: { userId: req.partnerUser.userId }, orderBy: { lastSeenAt: "desc" } });
    return { items };
  }

  @Delete("devices/:id")
  @ApiBearerAuth()
  @UseGuards(PartnerGuard)
  @Audit("partner.device_revoke", "device")
  async revoke(@Req() req: any, @Param("id", new ParseUUIDPipe()) id: string) {
    const d = await this.prisma.trustedDevice.findFirst({ where: { id, userId: req.partnerUser.userId } });
    if (!d) throw new BadRequestException({ code: "NOT_FOUND" });
    await this.prisma.trustedDevice.delete({ where: { id } });
    return { ok: true };
  }
}
