import { Injectable, NotFoundException, BadRequestException, UnauthorizedException, Logger } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class PartnerPortalService {
  private readonly logger = new Logger(PartnerPortalService.name);

  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async login(email: string, password: string, deviceFingerprint?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        orgMembers: { include: { organization: { include: { partner: true } } } },
        profile: true,
      },
    });

    if (!user || user.accountType !== "STAFF") {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordOk = user.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : false;
    const accessCodeOk = user.accessCode === password;

    if (!passwordOk && !accessCodeOk) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const partnerMembership = user.orgMembers.find(
      (m: any) => m.role === "PARTNER_USER" && m.organization.partner
    );
    if (!partnerMembership) {
      throw new UnauthorizedException("Not authorized as partner");
    }

    const roles = ["PARTNER_USER"];
    const accessToken = this.jwt.sign(
      {
        sub: user.id,
        roles,
        partnerId: partnerMembership.organizationId,
        scope: "partner-portal",
      },
      { expiresIn: "7d" },
    );

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        partnerId: partnerMembership.organizationId,
        organizationName: partnerMembership.organization.displayName,
        partnerLegalName: partnerMembership.organization.legalName,
        roles,
        profile: user.profile,
      },
    };
  }

  async getMe(partnerId: string, userId: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { organizationId: partnerId },
      include: {
        organization: true,
        services: { take: 10 },
        drivers: {
          take: 10,
          include: { user: { select: { email: true, profile: true } } },
        },
        vehicles: { take: 10 },
        settlements: { take: 5 },
        documents: { take: 10 },
      },
    });
    if (!partner) throw new NotFoundException("Partner not found");
    return partner;
  }

  async getDashboard(partnerId: string) {
    // Booking has providerId directly
    const [totalBookings, totalDrivers, totalVehicles, totalSettlements, totalDocs] = await Promise.all([
      this.prisma.booking.count({ where: { providerId: partnerId } }),
      this.prisma.driver.count({ where: { partnerId } }),
      this.prisma.vehicle.count({ where: { partnerId } }),
      this.prisma.settlement.count({ where: { partnerId } }),
      this.prisma.partnerDocument.count({ where: { partnerId } }),
    ]);

    const settlementSum = await this.prisma.settlement.aggregate({
      where: { partnerId, status: { in: ["OPEN", "APPROVED", "PAID"] as any } },
      _sum: { netMinor: true },
    });

    return {
      totalBookings,
      totalDrivers,
      totalVehicles,
      totalSettlements,
      totalDocuments: totalDocs,
      totalRevenueMinor: settlementSum._sum.netMinor ?? 0,
    };
  }

  async listBookings(partnerId: string, params: { status?: string; limit?: number } = {}) {
    const where: any = { providerId: partnerId };
    if (params.status) where.status = params.status;
    const items = await this.prisma.booking.findMany({
      where,
      include: {
        service: { select: { id: true, title: true, type: true } },
        traveler: { select: { id: true, email: true, profile: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(params.limit ?? 50, 200),
    });
    return { items, total: await this.prisma.booking.count({ where }) };
  }

  async listDrivers(partnerId: string) {
    // Driver model has no createdAt — sort by userId (deterministic)
    return this.prisma.driver.findMany({
      where: { partnerId },
      include: {
        user: { select: { id: true, email: true, phone: true, profile: true } },
        _count: { select: { vehicles: true } },
      },
    });
  }

  async listVehicles(partnerId: string) {
    // Vehicle has no createdAt — sort by id
    return this.prisma.vehicle.findMany({
      where: { partnerId },
      include: {
        driver: { include: { user: { select: { email: true, profile: true } } } },
      },
    });
  }

  async listSettlements(partnerId: string) {
    return this.prisma.settlement.findMany({
      where: { partnerId },
      orderBy: { periodStart: "desc" },
    });
  }

  async listDocuments(partnerId: string) {
    return this.prisma.partnerDocument.findMany({
      where: { partnerId },
      orderBy: { createdAt: "desc" },
    });
  }

  async uploadDocument(partnerId: string, data: {
    docType: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType?: string;
    uploadedBy?: string;
    notes?: string;
  }) {
    const validTypes = ["LICENSE", "CONTRACT", "INSURANCE", "TAX", "OTHER"];
    if (!validTypes.includes(data.docType)) {
      throw new BadRequestException(`docType must be one of: ${validTypes.join(", ")}`);
    }

    return this.prisma.partnerDocument.create({
      data: {
        partnerId,
        docType: data.docType,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType ?? null,
        uploadedBy: data.uploadedBy ?? null,
        notes: data.notes ?? null,
        status: "PENDING",
      },
    });
  }

  async deleteDocument(partnerId: string, docId: string) {
    const doc = await this.prisma.partnerDocument.findUnique({ where: { id: docId } });
    if (!doc || doc.partnerId !== partnerId) {
      throw new NotFoundException("Document not found");
    }
    await this.prisma.partnerDocument.delete({ where: { id: docId } });
    return { ok: true };
  }

  async createPartnerUser(data: {
    partnerId: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    const partner = await this.prisma.partner.findUnique({
      where: { organizationId: data.partnerId },
      include: { organization: true },
    });
    if (!partner) throw new NotFoundException("Partner not found");

    const existing = await this.prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) throw new BadRequestException("Email already in use");

    const passwordHash = await bcrypt.hash(data.password, 10);
    const accessCode = "PRT-" + randomBytes(4).toString("hex").toUpperCase();

    // Create orgMember separately after user creation (relation-based)
    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        username: data.email.split("@")[0],
        passwordHash,
        accessCode,
        accountType: "STAFF",
        status: "ACTIVE",
        profile: {
          create: {
            firstName: data.firstName ?? "",
            lastName: data.lastName ?? "",
          },
        },
      },
      include: { profile: true },
    });

    // Create OrganizationMember link separately
    await this.prisma.organizationMember.create({
      data: {
        organizationId: data.partnerId,
        userId: user.id,
        role: "PARTNER_USER" as any,
      },
    });

    this.logger.log(`Partner user created: ${user.email} for ${partner.organization.displayName}`);
    return { user: { ...user, orgMembers: [{ role: "PARTNER_USER", organizationId: data.partnerId }] }, accessCode };
  }
}
