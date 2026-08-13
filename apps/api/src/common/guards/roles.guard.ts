import { CanActivate, ExecutionContext, Injectable, SetMetadata, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "../../auth/jwt.service.js";
import { Request } from "express";

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;

    // دايمًا حاول نقرأ الـ token عشان req.user يبقى متاح للـ controllers
    if (auth && auth.startsWith("Bearer ")) {
      try {
        (req as any).user = this.jwt.verifyAccess(auth.slice(7));
      } catch (e: any) {
        if (requiredRoles && requiredRoles.length > 0) {
          throw new UnauthorizedException({ code: "INVALID_TOKEN", message: e?.message ?? "Token verification failed" });
        }
      }
    } else if (requiredRoles && requiredRoles.length > 0) {
      throw new UnauthorizedException({ code: "NO_TOKEN", message: "Bearer token required" });
    }

    // لو الـ endpoint محدد roles، تأكد إن المستخدم عنده واحدة منهم
    if (requiredRoles && requiredRoles.length > 0) {
      const user = (req as any).user;
      if (!user || !user.roles || !user.roles.some((r: string) => requiredRoles.includes(r))) {
        throw new UnauthorizedException({ code: "FORBIDDEN", message: "Insufficient roles" });
      }
    }
    return true;
  }
}