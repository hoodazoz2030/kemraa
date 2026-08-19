import { Controller, Get, Patch, Body, UseGuards, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

@ApiTags("customer-profile")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
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
    const user = await this.prisma.user.update({
      where: { id: req.user.sub },
      data: {
        profile: {
          upsert: {
            create: { firstName: body.firstName, lastName: body.lastName, nationality: body.nationality, dob: body.dob ? new Date(body.dob) : null, preferences: body.preferences || {} },
            update: { firstName: body.firstName, lastName: body.lastName, nationality: body.nationality, dob: body.dob ? new Date(body.dob) : null, preferences: body.preferences || {} },
          },
        },
      },
      include: { profile: true },
    });
    return user;
  }
}
