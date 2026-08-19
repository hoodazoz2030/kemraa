import { Injectable, Logger } from "@nestjs/common";
import { MockFlightAdapter } from "./mock/mock-flight.adapter.js";
import type { BaseAdapter, ProviderIdentity } from "./interfaces/adapter.interface.js";

/**
 * §24 — Adapter Registry.
 * Central registry of all provider adapters.
 * Supports dynamic registration + lookup by id/code/serviceType.
 */
@Injectable()
export class AdapterRegistry {
  private readonly logger = new Logger(AdapterRegistry.name);
  private readonly adapters = new Map<string, BaseAdapter>();

  constructor(private readonly mockFlightAdapter: MockFlightAdapter) {
    // Register built-in adapters
    this.register(mockFlightAdapter);
  }

  register(adapter: BaseAdapter): void {
    const identity = adapter.getIdentity();
    this.adapters.set(identity.id, adapter);
    this.adapters.set(identity.code, adapter);
    this.logger.log(`Registered adapter: ${identity.code} (${identity.serviceType})`);
  }

  get(idOrCode: string): BaseAdapter | undefined {
    return this.adapters.get(idOrCode);
  }

  getByServiceType(serviceType: string): BaseAdapter[] {
    const seen = new Set<string>();
    const result: BaseAdapter[] = [];
    for (const adapter of this.adapters.values()) {
      const identity = adapter.getIdentity();
      if (identity.serviceType === serviceType && identity.enabled && !seen.has(identity.id)) {
        seen.add(identity.id);
        result.push(adapter);
      }
    }
    return result;
  }

  listProviders(): ProviderIdentity[] {
    const seen = new Set<string>();
    const result: ProviderIdentity[] = [];
    for (const adapter of this.adapters.values()) {
      const identity = adapter.getIdentity();
      if (!seen.has(identity.id)) {
        seen.add(identity.id);
        result.push(identity);
      }
    }
    return result;
  }
}
