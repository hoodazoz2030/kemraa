import { Controller, Get, Post, Query } from "@nestjs/common";
import { Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { SearchService } from "./search.service.js";

@Controller("search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  query(@Query("q") q?: string) {
    const term = (q ?? "").trim();
    if (term.length < 2) return { results: [] };
    return this.search.search(term);
  }

  @Post("reindex")
  @Roles("ADMIN", "STAFF")
  @Audit("search.reindex", "search")
  reindex() {
    return this.search.syncAll();
  }
}