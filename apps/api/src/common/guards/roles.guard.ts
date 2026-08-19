import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import * as jwt from "jsonwebtoken";

export const ROLES_KEY = "roles";

/**
 * Decorator for role-based access
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * §7 — RolesGuard with JWT verification built-in.
 * Works without Passport dependency.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // 1. Check if route has role requirements
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. Extract token
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      if (requiredRoles && requiredRoles.length > 0) {
        throw new UnauthorizedException({ code: "NO_TOKEN", message: "Authorization header required" });
      }
      return true;
    }

    const token = authHeader.substring(7);

    // 3. Verify and decode JWT
    const secret = process.env.JWT_SECRET || "test-secret-key-12345-for-testing-only-min-32-chars";
    let payload: any;
    try {
      payload = jwt.verify(token, secret);
    } catch (err: any) {
      throw new UnauthorizedException({ code: "INVALID_TOKEN", message: "Invalid or expired token" });
    }

    // 4. Attach user to request
    request.user = {
      sub: payload.sub,
      userId: payload.sub,
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
      roles: payload.roles || (payload.role ? [payload.role] : []),
      accountType: payload.accountType,
    };

    // 5. If no roles required, authenticated is enough
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 6. Check role access
    const userRoles: string[] = request.user.roles || [];
    
    // SUPER_ADMIN bypass
    if (userRoles.includes("SUPER_ADMIN")) {
      return true;
    }

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new UnauthorizedException({
        code: "FORBIDDEN",
        message: `Required role: ${requiredRoles.join(" or ")}`,
        details: { userRoles, requiredRoles },
      });
    }

    return true;
  }
}