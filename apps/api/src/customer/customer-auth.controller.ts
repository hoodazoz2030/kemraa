import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus, Get, Patch, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { randomUUID } from "node:crypto";
import * as bcrypt from "bcryptjs";

@ApiTags("customer-auth")
@Controller("auth")
export class CustomerAuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @Audit("auth.register", "user")
  async register(@Body() body: { email?: string; phone?: string; password?: string; locale?: string; nationality?: string }) {
    if (!body.email && !body.phone) {
      return { error: { code: "VALIDATION_ERROR", message: "Email or phone required" } };
    }

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { phone: body.phone }] },
    });
    if (existing) {
      return { error: { code: "USER_EXISTS", message: "User already exists" } };
    }

    const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : null;

    const user = await this.prisma.user.create({
      data: {
        email: body.email,
        phone: body.phone,
        passwordHash,
        locale: body.locale || "ar-EG",
        status: "ACTIVE" as any,
        role: "CUSTOMER" as any,
        accountType: "TRAVELER" as any,
      },
    });

    // Create profile if nationality provided
    if (body.nationality) {
      await this.prisma.userProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, nationality: body.nationality },
        update: { nationality: body.nationality },
      });
    }

    // Generate OTP (mock: 123456)
    const otp = "123456";
    await this.prisma.otp.create({
      data: {
        userId: user.id,
        code: otp,
        type: "VERIFY",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return { userId: user.id, message: "OTP sent (mock: 123456)" };
  }

  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: { userId: string; code: string }) {
    const otp = await this.prisma.otp.findFirst({
      where: { userId: body.userId, code: body.code, type: "VERIFY", usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return { error: { code: "INVALID_OTP", message: "Invalid or expired OTP" } };
    }

    await this.prisma.otp.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
    await this.prisma.user.update({ where: { id: body.userId }, data: { emailVerified: true, phoneVerified: true } });

    // Generate JWT
    const jwt = require("jsonwebtoken");
    const user = await this.prisma.user.findUnique({ where: { id: body.userId } });
    const token = jwt.sign(
      { sub: user!.id, email: user!.email, role: user!.role, roles: [user!.role], accountType: user!.accountType },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "7d" }
    );

    return { accessToken: token, user: { id: user!.id, email: user!.email, role: user!.role } };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email?: string; phone?: string; password: string }) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { phone: body.phone }] },
    });

    if (!user || !user.passwordHash) {
      return { error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" } };
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return { error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" } };
    }

    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, roles: [user.role], accountType: user.accountType },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "7d" }
    );

    return { accessToken: token, user: { id: user.id, email: user.email, role: user.role } };
  }

  @Post("logout")
  @UseGuards(AuthGuard("jwt"))
  @HttpCode(HttpStatus.OK)
  async logout() {
    return { success: true };
  }
}
