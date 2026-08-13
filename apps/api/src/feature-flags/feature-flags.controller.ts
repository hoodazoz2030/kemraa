import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { FeatureFlagsService } from "./feature-flags.service.js";
import { SetFlagDto } from "./dto/feature-flags.dto.js";

@Controller("feature-flags")
export class FeatureFlagsController {
  constructor(private readonly service: FeatureFlagsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(":key")
  get(@Param("key") key: string) {
    return this.service.get(key);
  }

  @Put(":key")
  @Roles("ADMIN", "STAFF")
  @Audit("flag.update", "feature_flag")
  set(@Param("key") key: string, @Body() body: SetFlagDto) {
    return this.service.set(key, body.enabled);
  }
}