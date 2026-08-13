import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

const TS_URL = process.env.TYPESENSE_URL ?? "http://host.docker.internal:8108";
const TS_KEY = process.env.TYPESENSE_API_KEY ?? "kemraa_typesense_key";
const COLLECTIONS = ["services", "trips"] as const;

@Injectable()
export class SearchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SearchService.name);
  available = false;
  private lastSync = new Date(0);
  private timer?: ReturnType<typeof setInterval>;
  private searchFields: Record<string, string> = {};

  constructor(private readonly prisma: PrismaService) {}

  private async ts(path: string, method: string, body?: any): Promise<any> {
    const res = await fetch(`${TS_URL}${path}`, {
      method,
      headers: { "X-TYPESENSE-API-KEY": TS_KEY, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Typesense ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async onModuleInit() {
    try {
      await this.ensureCollections();
      await this.syncAll();
      await this.loadSearchFields();
      this.available = true;
      this.timer = setInterval(() => {
        this.incrementalSync().catch((e) => this.logger.warn("incremental sync failed: " + e.message));
      }, 20000);
      this.logger.log("Search ready (Typesense connected)");
    } catch (e: any) {
      this.available = false;
      this.logger.warn("Typesense unavailable — search disabled: " + e.message);
    }
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private sanitize(row: any): any {
    const doc: any = { id: row.id };
    for (const [k, v] of Object.entries(row)) {
      if (k === "id") continue;
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") doc[k] = v;
      else if (v instanceof Date) doc[k] = v.toISOString();
    }
    return doc;
  }

  private async ensureCollections() {
    for (const name of COLLECTIONS) {
      try {
        await this.ts(`/collections/${name}`, "GET");
      } catch {
        await this.ts("/collections", "POST", { name, fields: [{ name: ".*", type: "auto" }] });
        this.logger.log(`created collection: ${name}`);
      }
    }
  }

  private async importDocs(coll: string, docs: any[]) {
    if (!docs.length) return;
    const body = docs.map((d) => JSON.stringify(d)).join("\n");
    const res = await fetch(`${TS_URL}/collections/${coll}/documents/import?action=upsert`, {
      method: "POST",
      headers: { "X-TYPESENSE-API-KEY": TS_KEY, "Content-Type": "text/plain" },
      body,
    });
    if (!res.ok) throw new Error(`import failed ${res.status}: ${await res.text()}`);
    const text = await res.text();
    if (text.includes('"success":false')) throw new Error("import errors: " + text.slice(0, 300));
  }

  async syncAll() {
    const [services, trips] = await Promise.all([
      this.prisma.service.findMany(),
      this.prisma.trip.findMany(),
    ]);
    await this.importDocs("services", services.map((s) => this.sanitize(s)));
    await this.importDocs("trips", trips.map((t) => this.sanitize(t)));
    this.lastSync = new Date();
    await this.loadSearchFields();
    return { services: services.length, trips: trips.length };
  }

  private async incrementalSync() {
    const since = this.lastSync;
    const [services, trips] = await Promise.all([
      this.prisma.service.findMany({ where: { updatedAt: { gt: since } } }),
      this.prisma.trip.findMany({ where: { updatedAt: { gt: since } } }),
    ]);
    if (services.length || trips.length) {
      await this.importDocs("services", services.map((s) => this.sanitize(s)));
      await this.importDocs("trips", trips.map((t) => this.sanitize(t)));
      this.logger.log(`incremental sync: +${services.length} services, +${trips.length} trips`);
    }
    this.lastSync = new Date();
  }

  private async loadSearchFields() {
    for (const name of COLLECTIONS) {
      try {
        const schema = await this.ts(`/collections/${name}`, "GET");
        const fields = (schema.fields ?? [])
          .filter((f: any) => f.type === "string" && f.name !== "id")
          .map((f: any) => f.name);
        this.searchFields[name] = fields.join(",") || "id";
      } catch {
        this.searchFields[name] = "id";
      }
    }
  }

  async search(q: string) {
    if (!this.available) {
      throw new ServiceUnavailableException({ code: "SEARCH_UNAVAILABLE", message: "Search engine is not ready" });
    }
    return this.ts("/multi_search", "POST", {
      searches: COLLECTIONS.map((c) => ({
        collection: c,
        q,
        query_by: this.searchFields[c] || "id",
        per_page: 10,
      })),
    });
  }
}