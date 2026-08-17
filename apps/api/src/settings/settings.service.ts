import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const row = await this.prisma.appSettings.findUnique({ where: { id: 1 } });
    return (row?.data as any) ?? {};
  }

  async update(data: Record<string, any>) {
    const cur = await this.get();
    const merged = { ...cur, ...data };
    await this.prisma.appSettings.upsert({
      where: { id: 1 },
      update: { data: merged },
      create: { id: 1, data: merged },
    });
    return merged;
  }
}
