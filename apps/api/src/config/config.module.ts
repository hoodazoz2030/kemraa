import { Global, Module } from "@nestjs/common";
import { loadAppConfig, AppConfig } from "./app.config.js";

export const APP_CONFIG = "APP_CONFIG";
const config: AppConfig = loadAppConfig();

@Global()
@Module({ providers: [{ provide: APP_CONFIG, useValue: config }], exports: [APP_CONFIG] })
export class AppConfigModule {}