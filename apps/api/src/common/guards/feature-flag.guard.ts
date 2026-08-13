import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { FeatureFlagsService } from "../../feature-flags/feature-flags.service.js";

export const REQUIRE_FLAG_KEY = "require_flag";
export const RequireFlag = (key: string) => SetMetadata(REQUIRE_FLAG_KEY, key);

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly flags: FeatureFlagsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.getAllAndOverride<string>(REQUIRE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!key) return true;
    const enabled = await this.flags.isEnabled(key);
    if (!enabled) {
      throw new ServiceUnavailableException({
        code: "FEATURE_DISABLED",
        message: `Feature "${key}" is currently disabled`,
      });
    }
    return true;
  }
}