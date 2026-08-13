import { NestFactory } from "@nestjs/core";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { Module } from "@nestjs/common";
import { randomUUID } from "node:crypto";

@Module({ providers: [PrismaService], exports: [PrismaService] })
class SeedModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedModule);
  const prisma = app.get(PrismaService);
  
  const user = await prisma.user.findFirst({ where: { email: "customer.ar@kemraa.local" } });
  if (!user) { console.error("User not found"); process.exit(1); }
  console.log("✓ Found user:", user.id);
  
  let org = await prisma.organization.findFirst();
  if (!org) {
    console.log("✓ Creating default org...");
    org = await (prisma.organization as any).create({
      data: { id: randomUUID(), displayName: "Kemraa Agency", type: "AGENCY", status: "ACTIVE" },
    });
  }
  console.log("✓ Org:", org!.id);
  
  const existing = await (prisma.organizationMember as any).findUnique({
    where: { organizationId_userId: { organizationId: org!.id, userId: user.id } },
  });
  
  if (existing) {
    await (prisma.organizationMember as any).update({
      where: { organizationId_userId: { organizationId: org!.id, userId: user.id } },
      data: { role: "ADMIN" },
    });
  } else {
    await (prisma.organizationMember as any).create({
      data: { organizationId: org!.id, userId: user.id, role: "ADMIN", status: "ACTIVE" },
    });
  }
  console.log("✓ User now has ADMIN role");
  
  await app.close();
}

bootstrap().catch((e) => { console.error(e); process.exit(1); });