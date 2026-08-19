import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

/**
 * §18 — Driver App Auth (public endpoints).
 * Uses AccountType=DRIVER and Driver entity linked to User.
 */
@ApiTags("driver-auth")
@Controller("driver-auth")
export class DriverAuthController {
  private readonly logger = new Logger(DriverAuthController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Driver registration: creates User + Driver entity.
   */
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @Audit("driver.register", "driver")
  async register(@Body() body: {
    email: string;
    password: string;
    phone: string;
    displayName?: string;
    licenseRef?: string;
    partnerId?: string; // Optional: link to partner org
  }) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { phone: body.phone }] },
    });
    if (existing) return { error: { code: "USER_EXISTS" } };

    const passwordHash = await bcrypt.hash(body.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: body.email,
          phone: body.phone,
          passwordHash,
          status: "ACTIVE" as any,
          role: "DRIVER" as any,
          accountType: "TRAVELER" as any,
        },
      });

      const driver = await tx.driver.create({
        data: {
          userId: user.id,
          partnerId: body.partnerId ?? null,
          licenseRef: body.licenseRef ?? null,
          verificationStatus: "UNVERIFIED" as any,
          status: "OFFLINE" as any,
          rating: null,
        },
      });

      return { user, driver };
    });

    this.logger.log(`Driver registered: userId=${result.user.id}`);

    return {
      userId: result.user.id,
      driverId: result.driver.userId,
      status: result.driver.status,
      verificationStatus: result.driver.verificationStatus,
      message: "Registration complete. Complete verification to go online.",
    };
  }

  /**
   * Driver login.
   */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email?: string; phone?: string; password: string }) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { phone: body.phone }] },
      include: { drivers: { take: 1 } },
    });

    if (!user || !user.passwordHash) return { error: { code: "INVALID_CREDENTIALS" } };

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) return { error: { code: "INVALID_CREDENTIALS" } };

    if (user.role !== "DRIVER") return { error: { code: "NOT_DRIVER" } };

    const driver = user.drivers?.[0];

    const secret = process.env.JWT_SECRET || "test-secret-key-12345-for-testing-only-min-32-chars";
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        roles: [user.role],
        accountType: user.accountType,
        driverId: driver?.userId,
        driverStatus: driver?.status,
        verificationStatus: driver?.verificationStatus,
      },
      secret,
      { expiresIn: "7d" },
    );

    return {
      accessToken: token,
      user: { id: user.id, email: user.email, phone: user.phone },
      driver: driver
        ? {
            userId: driver.userId,
            status: driver.status,
            verificationStatus: driver.verificationStatus,
            rating: driver.rating,
            partnerId: driver.partnerId,
          }
        : null,
    };
  }
}
