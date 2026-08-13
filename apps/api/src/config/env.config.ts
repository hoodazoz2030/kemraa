import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test", "local"]).default("local"),
  PORT: z.coerce.number().int().positive().default(4000),
  
  // Database
  DATABASE_URL: z.string().url().refine(
    (url) => url.startsWith("postgresql://") || url.startsWith("postgres://"),
    { message: "DATABASE_URL must be a postgresql:// URL" }
  ),
  
  // Redis
  REDIS_URL: z.string().url().default("redis://127.0.0.1:6379"),
  
  // JWT
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("30d"),
  
  // OTP
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  
  // Encryption
  ENCRYPTION_KEY: z.string().length(32, "ENCRYPTION_KEY must be exactly 32 characters"),
  
  // Optional
  AI_PROVIDER: z.enum(["mock", "openai", "anthropic"]).default("mock"),
  PAYMENT_PROVIDER: z.enum(["mock", "stripe", "fawry"]).default("mock"),
  DEFAULT_LOCALE: z.string().default("ar-EG"),
  DEFAULT_CURRENCY: z.string().default("EGP"),
  CORS_ORIGIN: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  try {
    const env = envSchema.parse(process.env);
    console.log(`[ENV] ✓ Validated in ${env.NODE_ENV} mode`);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("\n[ENV] ✗ Environment validation failed:\n");
      for (const issue of error.issues) {
        const path = issue.path.join(".");
        console.error(`  ✗ ${path}: ${issue.message}`);
      }
      console.error("\nPlease fix the environment variables and restart.\n");
      process.exit(1);
    }
    throw error;
  }
}