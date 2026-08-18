import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { UnifiedExceptionFilter } from "./common/filters/unified-exception.filter.js";
import helmet from "helmet";
import compression from "compression";
import express from "express";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { validateEnv } from "./config/env.config.js";
import { PrismaService } from "./prisma/prisma.service.js";

async function bootstrap() {
  // Validate environment BEFORE starting
  const env = validateEnv();

  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Security: Helmet (security headers)
  app.use(helmet());

  // Security: Compression
  app.use(compression());

  // Security: Body size limits
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // CORS
  app.enableCors({
    origin: env.CORS_ORIGIN?.split(",") ?? true,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix("api/v1");

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  // Swagger (only in non-production)
  if (env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("Kemraa API")
      .setDescription("Travel platform API")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document);
  }

  // Graceful shutdown
  const prismaService = app.get(PrismaService);
  
  const shutdown = async (signal: string) => {
    console.log(`\n[SHUTDOWN] Received ${signal}. Shutting down gracefully...`);
    try {
      await app.close();
      await prismaService.$disconnect();
      console.log("[SHUTDOWN] ✓ All connections closed");
      process.exit(0);
    } catch (error) {
      console.error("[SHUTDOWN] ✗ Error during shutdown:", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Start server
  const port = env.PORT;
  await app.listen(port, "0.0.0.0");
  console.log(`[kemraa-api] http://localhost:${port}/api/v1  |  Swagger: http://localhost:${port}/docs`);
}

bootstrap().catch((error) => {
  console.error("[BOOTSTRAP] ✗ Failed to start:", error);
  process.exit(1);
});