import { Injectable, Logger } from "@nestjs/common";
import { AdapterRegistry } from "./adapter-registry.service.js";
import type { SearchResult } from "./interfaces/adapter.interface.js";

/**
 * §24 — Adapter Orchestrator.
 * Aggregates search results from multiple adapters in parallel.
 * Used for unified search across all providers of a given service type.
 */
@Injectable()
export class AdapterOrchestrator {
  private readonly logger = new Logger(AdapterOrchestrator.name);

  constructor(private readonly registry: AdapterRegistry) {}

  /**
   * Search across ALL adapters of a given service type in parallel.
   * Returns aggregated results with provider attribution.
   */
  async searchAll(serviceType: string, query: any): Promise<{
    results: Array<SearchResult & { provider: { id: string; code: string; name: string } }>;
    errors: Array<{ provider: string; error: string }>;
    total: number;
  }> {
    const adapters = this.registry.getByServiceType(serviceType);
    this.logger.log(`Orchestrating search across ${adapters.length} ${serviceType} adapters`);

    if (adapters.length === 0) {
      return { results: [], errors: [], total: 0 };
    }

    const settled = await Promise.allSettled(
      adapters.map(async (adapter) => {
        const identity = adapter.getIdentity();
        const results = await adapter.search({ query });
        return {
          provider: { id: identity.id, code: identity.code, name: identity.name },
          results,
        };
      })
    );

    const results: any[] = [];
    const errors: any[] = [];

    for (const outcome of settled) {
      if (outcome.status === "fulfilled") {
        for (const r of outcome.value.results) {
          results.push({ ...r, provider: outcome.value.provider });
        }
      } else {
        errors.push({ provider: "unknown", error: String(outcome.reason?.message || outcome.reason) });
      }
    }

    // Sort by price ascending
    results.sort((a, b) => a.priceMinor - b.priceMinor);

    this.logger.log(`Orchestration complete: ${results.length} results, ${errors.length} errors`);
    return { results, errors, total: results.length };
  }

  /**
   * Book via a specific provider by code.
   */
  async bookByProviderCode(providerCode: string, params: any): Promise<any> {
    const adapter = this.registry.get(providerCode);
    if (!adapter) throw new Error(`Provider not found: ${providerCode}`);
    return await adapter.book(params);
  }
}
