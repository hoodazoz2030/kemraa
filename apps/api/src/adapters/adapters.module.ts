import { Module } from "@nestjs/common";
import { MockFlightAdapter } from "./mock/mock-flight.adapter.js";
import { MockHotelAdapter } from "./mock/mock-hotel.adapter.js";
import { MockActivityAdapter } from "./mock/mock-activity.adapter.js";
import { AdapterRegistry } from "./adapter-registry.service.js";
import { AdaptersController } from "./adapters.controller.js";

@Module({
  providers: [
    MockFlightAdapter,
    MockHotelAdapter,
    MockActivityAdapter,
    AdapterRegistry,
  ],
  controllers: [AdaptersController],
  exports: [AdapterRegistry, MockFlightAdapter, MockHotelAdapter, MockActivityAdapter],
})
export class AdaptersModule {}
