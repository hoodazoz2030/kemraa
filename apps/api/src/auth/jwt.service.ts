import { Injectable } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { APP_CONFIG } from "../config/config.module.js";
import { AppConfig } from "../config/app.config.js";
import { createHmac, randomBytes } from "node:crypto";

export interface AccessTokenPayload { sub: string; roles: string[]; type: "access"; }
export interface RefreshTokenPayload { sub: string; jti: string; type: "refresh"; }

// Minimal HS256 JWT implementation (no external dep). For production, swap to jose/jsonwebtoken.
function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function sign(payload: object, secret: string, expSeconds: number): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + expSeconds }));
  const sig = base64url(createHmac("sha256", secret).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}
function verify<T>(token: string, secret: string): T {
  const [h, b, s] = token.split(".");
  if (!h || !b || !s) throw new Error("invalid token");
  const expected = base64url(createHmac("sha256", secret).update(`${h}.${b}`).digest());
  if (expected !== s) throw new Error("invalid signature");
  const payload = JSON.parse(Buffer.from(b, "base64").toString()) as T & { exp: number };
  if (payload.exp < Math.floor(Date.now()/1000)) throw new Error("token expired");
  return payload;
}
function parseTtl(ttl: string): number {
  const m = ttl.match(/^(\d+)([smhd])$/);
  if (!m) return 900;
  const n = Number(m[1]); const u = m[2];
  return u === "s" ? n : u === "m" ? n*60 : u === "h" ? n*3600 : n*86400;
}

@Injectable()
export class JwtService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  signAccess(sub: string, roles: string[]): string {
    return sign({ sub, roles, type: "access" } satisfies AccessTokenPayload, this.config.jwtSecret, parseTtl(this.config.accessTokenTtl));
  }
  signRefresh(sub: string): { token: string; jti: string } {
    const jti = randomBytes(16).toString("hex");
    const token = sign({ sub, jti, type: "refresh" } satisfies RefreshTokenPayload, this.config.jwtRefreshSecret, parseTtl(this.config.refreshTokenTtl));
    return { token, jti };
  }
  verifyAccess(token: string): AccessTokenPayload { return verify<AccessTokenPayload>(token, this.config.jwtSecret); }
  verifyRefresh(token: string): RefreshTokenPayload { return verify<RefreshTokenPayload>(token, this.config.jwtRefreshSecret); }
}