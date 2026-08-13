import { CallHandler, ExecutionContext, Injectable, NestInterceptor, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, tap } from "rxjs";
import { PrismaService } from "../../prisma/prisma.service.js";
import { Request } from "express";

export const AUDIT_KEY = "audit";
export const Audit = (action: string, resourceType: string) => SetMetadata(AUDIT_KEY, { action, resourceType });

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const meta = this.reflector.getAllAndOverride<{ action: string; resourceType: string }>(AUDIT_KEY, [context.getHandler(), context.getClass()]);
    if (!meta) return next.handle();
    const req = context.switchToHttp().getRequest<Request>();
    const actorId = (req as any)?.user?.sub ?? null;
    const ip = req.ip ?? req.socket.remoteAddress ?? null;
    return next.handle().pipe(
      tap(() => {
        this.prisma.auditLog.create({
          data: { actorId, action: meta.action, resourceType: meta.resourceType, resourceId: (req.params?.id as string) ?? null, metadata: { method: req.method, path: req.path }, ip },
        }).catch((e) => console.error("[AUDIT] failed:", e.message));
      }),
    );
  }
}