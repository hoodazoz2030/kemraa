import { Controller, Get, Patch, Body, UseGuards, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

@ApiTags("customer-profile")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("users")
export class CustomerProfileController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("me")
  @Roles("CUSTOMER")
  async getMe(@Req() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { profile: true, trips: { take: 5, orderBy: { createdAt: "desc" } } },
    });
    return user;
  }

  @Patch("me")
  @Roles("CUSTOMER")
  @Audit("user.update_profile", "user")
  async updateMe(@Req() req: any, @Body() body: { firstName?: string; lastName?: string; nationality?: string; dob?: string; preferences?: any }) {
    const userId = req.user.sub;

    await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        firstName: body.firstName ?? null,
        lastName: body.lastName ?? null,
        nationality: body.nationality ?? null,
        dob: body.dob ? new Date(body.dob) : null,
        preferences: (body.preferences ?? {}) as any,
      },
      update: {
        firstName: body.firstName ?? undefined,
        lastName: body.lastName ?? undefined,
        nationality: body.nationality ?? undefined,
        dob: body.dob ? new Date(body.dob) : undefined,
        preferences: (body.preferences ?? undefined) as any,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    return user;
  }
}