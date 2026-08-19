import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

@ApiTags("partner-auth")
@Controller("partner-auth")
export class PartnerAuthController {
  private readonly logger = new Logger(PartnerAuthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @Audit("partner.register", "organization")
  async register(@Body() body: {
    email: string;
    password: string;
    legalName: string;
    displayName?: string;
    businessType?: string;
    registrationCountry?: string;
    taxId?: string;
    website?: string;
    contactPhone?: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return { error: { code: "EMAIL_TAKEN" } };

    const passwordHash = await bcrypt.hash(body.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      // Create org with only schema-valid fields
      const org = await tx.organization.create({
        data: {
          legalName: body.legalName,
          displayName: body.displayName || body.legalName,
          status: "PENDING_KYB" as any,
        } as any,
      });

      const user = await tx.user.create({
        data: {
          email: body.email,
          passwordHash,
          status: "ACTIVE" as any,
          role: "CUSTOMER" as any,
          accountType: "PARTNER" as any,
        },
      });

      // Create membership
      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: "ADMIN" as any, // Use valid Role enum value
          status: "ACTIVE" as any,
        } as any,
      });

      // Create KYB draft (this holds businessType, taxId, etc.)
      const kyb = await tx.kYB.create({
        data: {
          organizationId: org.id,
          legalName: body.legalName,
          businessType: body.businessType || "LLC",
          registrationCountry: body.registrationCountry || "EG",
          taxId: body.taxId ?? null,
          website: body.website ?? null,
          contactEmail: body.email,
          contactPhone: body.contactPhone ?? null,
          status: "DRAFT" as any,
        },
      });

      return { org, user, kyb };
    });

    this.logger.log(`Partner registered: org=${result.org.id}, user=${result.user.id}`);

    return {
      userId: result.user.id,
      organizationId: result.org.id,
      kybId: result.kyb.id,
      message: "Registration complete. Complete KYB to activate.",
    };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
      include: {
        orgMembers: {
          include: { organization: true },
        },
      },
    });

    if (!user || !user.passwordHash) {
      return { error: { code: "INVALID_CREDENTIALS" } };
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) return { error: { code: "INVALID_CREDENTIALS" } };

    if (user.accountType !== "PARTNER") {
      return { error: { code: "NOT_PARTNER" } };
    }

    const membership = user.orgMembers?.[0];
    const org = membership?.organization;

    const secret = process.env.JWT_SECRET || "test-secret-key-12345-for-testing-only-min-32-chars";
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        roles: [user.role],
        accountType: user.accountType,
        organizationId: org?.id,
        organizationStatus: org?.status,
        orgRole: membership?.role,
      },
      secret,
      { expiresIn: "7d" },
    );

    return {
      accessToken: token,
      user: { id: user.id, email: user.email, accountType: user.accountType },
      organization: org
        ? { id: org.id, displayName: org.displayName, legalName: org.legalName, status: org.status }
        : null,
      membership: membership ? { role: membership.role, status: membership.status } : null,
    };
  }
}
