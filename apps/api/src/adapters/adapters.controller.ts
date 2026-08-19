import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, SetMetadata, Logger } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { AdapterRegistry } from "./adapter-registry.service.js";
import { AdapterOrchestrator } from "./adapter-orchestrator.service.js";

/**
 * §24 — Provider adapter API.
 * Allows admin/internal callers to search/book/cancel via adapters.
 */
@ApiTags("adapters")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("adapters")
export class AdaptersController {
  private readonly logger = new Logger(AdaptersController.name);

  constructor(
    private readonly registry: AdapterRegistry,
    private readonly orchestrator: AdapterOrchestrator,
  ) {}

  @Get("providers")
  @SetMetadata("roles", ["CUSTOMER", "ADMIN", "OPERATIONS"])
  async listProviders() {
    return { providers: this.registry.listProviders() };
  }

  @Post(":providerId/search")
  @SetMetadata("roles", ["CUSTOMER", "ADMIN", "OPERATIONS"])
  async search(@Param("providerId") providerId: string, @Body() body: any) {
    const adapter = this.registry.get(providerId);
    if (!adapter) return { error: { code: "PROVIDER_NOT_FOUND" } };

    try {
      const results = await adapter.search({ query: body });
      return { results, count: results.length, provider: adapter.getIdentity() };
    } catch (err: any) {
      this.logger.error(`Search failed: ${err.message}`);
      return { error: { code: "SEARCH_FAILED", message: err.message } };
    }
  }

  @Post(":providerId/book")
  @SetMetadata("roles", ["CUSTOMER", "ADMIN", "OPERATIONS"])
  async book(@Param("providerId") providerId: string, @Body() body: any) {
    const adapter = this.registry.get(providerId);
    if (!adapter) return { error: { code: "PROVIDER_NOT_FOUND" } };

    try {
      const result = await adapter.book(body);
      return result;
    } catch (err: any) {
      this.logger.error(`Book failed: ${err.message}`);
      return { error: { code: "BOOK_FAILED", message: err.message } };
    }
  }

  @Post(":providerId/cancel")
  @SetMetadata("roles", ["CUSTOMER", "ADMIN", "OPERATIONS"])
  async cancel(@Param("providerId") providerId: string, @Body() body: any) {
    const adapter = this.registry.get(providerId);
    if (!adapter) return { error: { code: "PROVIDER_NOT_FOUND" } };

    try {
      const result = await adapter.cancel(body);
      return result;
    } catch (err: any) {
      return { error: { code: "CANCEL_FAILED", message: err.message } };
    }
  }

  @Get(":providerId/status/:externalRef")
  @SetMetadata("roles", ["CUSTOMER", "ADMIN", "OPERATIONS"])
  async status(@Param("providerId") providerId: string, @Param("externalRef") externalRef: string) {
    const adapter = this.registry.get(providerId);
    if (!adapter) return { error: { code: "PROVIDER_NOT_FOUND" } };

    return await adapter.checkStatus(externalRef);
  }

  /**
   * POST /adapters/search/:serviceType — search across ALL adapters of a type
   */
  @Post("search/:serviceType")
  @SetMetadata("roles", ["CUSTOMER", "ADMIN", "OPERATIONS"])
  async unifiedSearch(@Param("serviceType") serviceType: string, @Body() body: any) {
    try {
      const aggregated = await this.orchestrator.searchAll(serviceType, body);
      return aggregated;
    } catch (err: any) {
      return { error: { code: "ORCHESTRATION_FAILED", message: err.message } };
    }
  }
}