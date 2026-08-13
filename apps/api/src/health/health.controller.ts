import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service.js";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("live") live() { return { status: "ok" }; }

  @Get("ready")
  async ready() {
    try {
      await this.prisma.$queryRawUnsafe("SELECT 1");
      return { status: "ok", db: "connected" };
    } catch (e: any) {
      return { status: "degraded", db: e?.message ?? "unknown error" };
    }
  }
}