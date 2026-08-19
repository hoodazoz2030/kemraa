import { Module } from "@nestjs/common";
import { MockFlightAdapter } from "./mock/mock-flight.adapter.js";
import { AdapterRegistry } from "./adapter-registry.service.js";
import { AdaptersController } from "./adapters.controller.js";

@Module({
  providers: [MockFlightAdapter, AdapterRegistry],
  controllers: [AdaptersController],
  exports: [AdapterRegistry, MockFlightAdapter],
})
export class AdaptersModule {}
