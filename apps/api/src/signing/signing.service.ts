import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { randomBytes, createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class SigningService {
  private readonly logger = new Logger(SigningService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createSigningRequest(data: {
    partnerId: string;
    signerEmail: string;
    signerName?: string;
    signerTitle?: string;
    contractType?: string;
    expiresInDays?: number;
    issuedBy?: string;
  }) {
    // Validate partner
    const partner = await this.prisma.partner.findUnique({
      where: { organizationId: data.partnerId },
      include: { organization: true },
    });
    if (!partner) throw new NotFoundException("Partner not found");

    // Generate secure token
    const signingToken = randomBytes(32).toString("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays ?? 14));

    // Generate contract hash
    const contractPayload = {
      partnerId: partner.organizationId,
      legalName: partner.organization.legalName,
      contractType: data.contractType ?? "PARTNERSHIP",
      issuedAt: new Date().toISOString(),
    };
    const contractHash = createHash("sha256")
      .update(JSON.stringify(contractPayload))
      .digest("hex");

    const request = await this.prisma.signingRequest.create({
      data: {
        partnerId: data.partnerId,
        contractType: data.contractType ?? "PARTNERSHIP",
        signingToken,
        signerEmail: data.signerEmail,
        signerName: data.signerName ?? null,
        signerTitle: data.signerTitle ?? null,
        expiresAt,
        contractHash,
        status: "DRAFT",
        issuedBy: data.issuedBy ?? null,
      },
      include: {
        partner: { include: { organization: true } },
      },
    });

    this.logger.log(`Signing request created: ${request.id} for ${data.signerEmail}`);
    return { request, signingToken };
  }

  async sendSigningRequest(requestId: string, sendEmailFn?: (data: any) => Promise<void>) {
    const request = await this.prisma.signingRequest.findUnique({
      where: { id: requestId },
      include: { partner: { include: { organization: true } } },
    });
    if (!request) throw new NotFoundException("Signing request not found");
    if (request.status !== "DRAFT") throw new BadRequestException("Already sent");
    if (new Date() > request.expiresAt) throw new BadRequestException("Request expired");

    // Build signing URL (will be configured with env var later)
    const baseUrl = process.env.PUBLIC_APP_URL ?? "http://localhost:3001";
    const signingUrl = `${baseUrl}/sign/${request.signingToken}`;

    const emailData = {
      to: request.signerEmail,
      subject: `Contract Signing Request — ${request.partner.organization.displayName}`,
      signingUrl,
      partnerName: request.partner.organization.displayName,
      signerName: request.signerName ?? "there",
      expiresAt: request.expiresAt.toISOString(),
    };

    if (sendEmailFn) {
      try {
        await sendEmailFn(emailData);
      } catch (err: any) {
        this.logger.warn(`Email send failed: ${err.message} — marking as SENT anyway for demo`);
      }
    }

    const updated = await this.prisma.signingRequest.update({
      where: { id: requestId },
      data: { status: "SENT", sentAt: new Date() },
    });

    this.logger.log(`Signing request sent: ${request.id} → ${request.signerEmail}`);
    return { request: updated, signingUrl };
  }

  async markViewed(signingToken: string, ip: string, userAgent: string) {
    const request = await this.prisma.signingRequest.findUnique({
      where: { signingToken },
      include: { partner: { include: { organization: true } } },
    });
    if (!request) throw new NotFoundException("Invalid signing link");
    if (new Date() > request.expiresAt) throw new BadRequestException("Link expired");
    if (["SIGNED", "COMPLETED", "CANCELLED"].includes(request.status)) {
      throw new BadRequestException("Signing already completed");
    }

    if (!request.viewedAt) {
      await this.prisma.signingRequest.update({
        where: { id: request.id },
        data: {
          status: "VIEWED",
          viewedAt: new Date(),
          signerIp: ip.slice(0, 45),
          signerUserAgent: userAgent.slice(0, 500),
        },
      });
    }

    return {
      request: { ...request, status: "VIEWED", viewedAt: request.viewedAt ?? new Date() },
    };
  }

  async completeSigning(signingToken: string, data: {
    signerName: string;
    signatureData: any;
    ip: string;
    userAgent: string;
    fingerprint?: string;
  }) {
    const request = await this.prisma.signingRequest.findUnique({
      where: { signingToken },
      include: { partner: { include: { organization: true } } },
    });
    if (!request) throw new NotFoundException("Invalid signing link");
    if (new Date() > request.expiresAt) throw new BadRequestException("Link expired");
    if (["SIGNED", "COMPLETED", "CANCELLED"].includes(request.status)) {
      throw new BadRequestException("Already signed");
    }

    const now = new Date();
    const updated = await this.prisma.signingRequest.update({
      where: { id: request.id },
      data: {
        status: "COMPLETED",
        signedAt: now,
        completedAt: now,
        signerName: data.signerName,
        signatureData: data.signatureData,
        signerIp: data.ip.slice(0, 45),
        signerUserAgent: data.userAgent.slice(0, 500),
        signerFingerprint: data.fingerprint?.slice(0, 64) ?? null,
      },
      include: { partner: { include: { organization: true } } },
    });

    // Update partner contract status to ACTIVE
    await this.prisma.partner.update({
      where: { organizationId: request.partnerId },
      data: { contractStatus: "ACTIVE" },
    });
    await this.prisma.organization.update({
      where: { id: request.partnerId },
      data: { status: "ACTIVE" },
    });

    this.logger.log(`Contract signed: ${request.id} by ${data.signerName}`);
    return updated;
  }

  async getSigningRequest(signingToken: string) {
    const request = await this.prisma.signingRequest.findUnique({
      where: { signingToken },
      include: { partner: { include: { organization: true } } },
    });
    if (!request) throw new NotFoundException("Invalid signing link");
    return request;
  }

  async listByPartner(partnerId: string) {
    return this.prisma.signingRequest.findMany({
      where: { partnerId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  async cancelRequest(requestId: string) {
    const request = await this.prisma.signingRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException("Not found");
    if (["SIGNED", "COMPLETED"].includes(request.status)) {
      throw new BadRequestException("Cannot cancel signed contract");
    }
    return this.prisma.signingRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED" },
    });
  }

  async stats() {
    const total = await this.prisma.signingRequest.count();
    const draft = await this.prisma.signingRequest.count({ where: { status: "DRAFT" } });
    const sent = await this.prisma.signingRequest.count({ where: { status: "SENT" } });
    const viewed = await this.prisma.signingRequest.count({ where: { status: "VIEWED" } });
    const signed = await this.prisma.signingRequest.count({ where: { status: { in: ["SIGNED", "COMPLETED"] } } });
    return { total, draft, sent, viewed, signed };
  }
}
