import { Module } from "@nestjs/common";
import { MockFlightAdapter } from "./mock/mock-flight.adapter.js";
import { MockHotelAdapter } from "./mock/mock-hotel.adapter.js";
import { MockActivityAdapter } from "./mock/mock-activity.adapter.js";
import { AdapterRegistry } from "./adapter-registry.service.js";
import { AdapterOrchestrator } from "./adapter-orchestrator.service.js";
import { AdaptersController } from "./adapters.controller.js";
import { AdapterWebhooksController } from "./adapter-webhooks.controller.js";
import { TripPlanController } from "./trip-plan.controller.js";

@Module({
  providers: [
    MockFlightAdapter,
    MockHotelAdapter,
    MockActivityAdapter,
    AdapterRegistry,
    AdapterOrchestrator,
  ],
  controllers: [AdaptersController, AdapterWebhooksController, TripPlanController],
  exports: [
    AdapterRegistry,
    AdapterOrchestrator,
    MockFlightAdapter,
    MockHotelAdapter,
    MockActivityAdapter,
  ],
})
export class AdaptersModule {}
