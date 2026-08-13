export interface AppConfig {
  nodeEnv: string;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  encryptionKey: string;
  aiProvider: string;
  paymentProvider: string;
  defaultLocale: string;
  defaultCurrency: string;
  accessTokenTtl: string;
  refreshTokenTtl: string;
  otpTtlSeconds: number;
}

export function loadAppConfig(): AppConfig {
  const required = ["DATABASE_URL","REDIS_URL","JWT_SECRET","JWT_REFRESH_SECRET","ENCRYPTION_KEY"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length && process.env.NODE_ENV !== "test") throw new Error("Missing env: " + missing.join(","));
  return {
    nodeEnv: process.env.NODE_ENV ?? "local",
    databaseUrl: process.env.DATABASE_URL!,
    redisUrl: process.env.REDIS_URL!,
    jwtSecret: process.env.JWT_SECRET!,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
    encryptionKey: process.env.ENCRYPTION_KEY!,
    aiProvider: process.env.AI_PROVIDER ?? "mock",
    paymentProvider: process.env.PAYMENT_PROVIDER ?? "mock",
    defaultLocale: process.env.DEFAULT_LOCALE ?? "ar-EG",
    defaultCurrency: process.env.DEFAULT_CURRENCY ?? "EGP",
    accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
    refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? "30d",
    otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 600),
  };
}