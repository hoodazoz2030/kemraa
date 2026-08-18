import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response } from "express";
import { randomUUID } from "node:crypto";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void) {
    const requestId = (req.headers["x-request-id"] as string) || `req_${randomUUID()}`;
    (req as any).requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
  }
}
