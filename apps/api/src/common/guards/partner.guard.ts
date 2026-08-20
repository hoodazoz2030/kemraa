import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service.js";

@Injectable()
export class PartnerGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) throw new UnauthorizedException("Missing token");

    const token = auth.slice(7);
    let payload: any;
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException("Invalid token");
    }

    const userId = payload.sub || payload.userId;
    if (!userId) throw new UnauthorizedException("Invalid payload");

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        orgMembers: { include: { organization: { include: { partner: true } } } },
        profile: true,
      },
    });
    if (!user) throw new UnauthorizedException("User not found");

    const partnerMembership = user.orgMembers.find(
      (m: any) => ["PARTNER_ADMIN", "PARTNER_STAFF", "PARTNER_USER"].includes(m.role) && m.organization.partner
    );
    if (!partnerMembership) {
      throw new UnauthorizedException("Not authorized as partner");
    }

    req.partnerUser = {
      userId: user.id,
      email: user.email,
      username: user.username,
      partnerId: partnerMembership.organizationId,
      organizationName: partnerMembership.organization.displayName,
      role: partnerMembership.role,
    };

    return true;
  }
}
