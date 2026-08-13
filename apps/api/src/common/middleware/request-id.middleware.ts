import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { randomBytes } from "node:crypto";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const id = (req.headers["x-request-id"] as string) ?? randomBytes(8).toString("hex");
    req.headers["x-request-id"] = id;
    res.setHeader("x-request-id", id);
    next();
  }
}