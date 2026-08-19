import { Controller, Get, Post, Put, Body, UseGuards, Req, Param, SetMetadata, Logger } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §19 — Partner KYB (Know Your Business) management.
 */
@ApiTags("partner-kyb")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("partner-kyb")
export class PartnerKYBController {
  private readonly logger = new Logger(PartnerKYBController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get("current")
  @SetMetadata("roles", ["CUSTOMER"])
  async getCurrent(@Req() req: any) {
    // Find KYB for the user's organization
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: req.user.sub },
      include: { organization: { include: { kybs: { orderBy: { createdAt: "desc" }, take: 1 } } } },
    });
    if (!membership) return { error: { code: "NO_ORGANIZATION" } };
    return {
      organization: {
        id: membership.organization.id,
        displayName: membership.organization.displayName,
        legalName: membership.organization.legalName,
        status: membership.organization.status,
      },
      kyb: membership.organization.kybs[0] || null,
    };
  }

  /**
   * Update KYB draft (before submission).
   */
  @Put(":kybId")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("kyb.update", "kyb")
  async updateKYB(@Req() req: any, @Param("kybId") kybId: string, @Body() body: any) {
    const kyb = await this.prisma.kYB.findUnique({
      where: { id: kybId },
      include: { organization: { include: { members: { where: { userId: req.user.sub } } } } },
    });
    if (!kyb) return { error: { code: "NOT_FOUND" } };
    if (kyb.organization.members.length === 0) return { error: { code: "FORBIDDEN" } };
    if (kyb.status !== "DRAFT" && kyb.status !== "REJECTED") {
      return { error: { code: "INVALID_STATE", message: "Can only edit DRAFT or REJECTED" } };
    }

    const data: any = {};
    if (body.legalName) data.legalName = body.legalName;
    if (body.taxId !== undefined) data.taxId = body.taxId;
    if (body.businessType) data.businessType = body.businessType;
    if (body.registrationCountry) data.registrationCountry = body.registrationCountry;
    if (body.website !== undefined) data.website = body.website;
    if (body.contactPhone !== undefined) data.contactPhone = body.contactPhone;
    if (body.documents) data.documents = body.documents;

    return await this.prisma.kYB.update({ where: { id: kybId }, data });
  }

  /**
   * Submit KYB for review (DRAFT/REJECTED → SUBMITTED).
   */
  @Post(":kybId/submit")
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("kyb.submit", "kyb")
  async submit(@Req() req: any, @Param("kybId") kybId: string) {
    const kyb = await this.prisma.kYB.findUnique({
      where: { id: kybId },
      include: { organization: { include: { members: { where: { userId: req.user.sub } } } } },
    });
    if (!kyb) return { error: { code: "NOT_FOUND" } };
    if (kyb.organization.members.length === 0) return { error: { code: "FORBIDDEN" } };
    if (kyb.status !== "DRAFT" && kyb.status !== "REJECTED") {
      return { error: { code: "INVALID_STATE" } };
    }

    return await this.prisma.kYB.update({
      where: { id: kybId },
      data: { status: "SUBMITTED" as any },
    });
  }
}
