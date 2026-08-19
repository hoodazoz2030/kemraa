import { Controller, Get, Patch, Body, UseGuards, Req, SetMetadata } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

@ApiTags("partner-profile")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("partner-profile")
export class PartnerProfileController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @SetMetadata("roles", ["CUSTOMER"])
  async get(@Req() req: any) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: req.user.sub },
    });
    if (!membership) return { error: { code: "NO_ORGANIZATION" } };

    const organization = await this.prisma.organization.findUnique({
      where: { id: membership.organizationId },
      include: {
        kybs: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { members: true } },
      },
    });

    if (!organization) return { error: { code: "ORGANIZATION_NOT_FOUND" } };

    return {
      organization,
      membership: { role: membership.role, status: membership.status },
    };
  }

  @Patch()
  @SetMetadata("roles", ["CUSTOMER"])
  @Audit("partner.update_profile", "organization")
  async update(@Req() req: any, @Body() body: { displayName?: string; metadata?: any }) {
    // Only PARTNER_ADMIN can update
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: req.user.sub, role: "PARTNER_ADMIN" as any },
    });
    if (!membership) return { error: { code: "FORBIDDEN", message: "Only PARTNER_ADMIN" } };

    const data: any = {};
    if (body.displayName) data.displayName = body.displayName;
    if (body.metadata !== undefined) data.metadata = body.metadata;

    return await this.prisma.organization.update({
      where: { id: membership.organizationId },
      data,
    });
  }
}
