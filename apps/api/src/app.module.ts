import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module.js";
import { AppConfigModule } from "./config/config.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { HealthModule } from "./health/health.module.js";
import { UsersModule } from "./users/users.module.js";
import { TripsModule } from "./trips/trips.module.js";
import { ServicesModule } from "./services/services.module.js";
import { BookingsModule } from "./bookings/bookings.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { SupportModule } from "./support/support.module.js";
import { LocationsModule } from "./locations/locations.module.js";
import { RedisModule } from "./redis/redis.module.js";
import { QueuesModule } from "./queues/queues.module.js";
import { RefundsModule } from "./refunds/refunds.module.js";
import { CommissionsModule } from "./commissions/commissions.module.js";
import { StaffModule } from "./staff/staff.module.js";
import { AuditLogsModule } from "./audit-logs/audit-logs.module.js";
import { FeatureFlagsModule } from "./feature-flags/feature-flags.module.js";
import { SearchModule } from "./search/search.module.js";
import { PaymentsModule } from "./payments/payments.module.js";
import { AnalyticsModule } from "./analytics/analytics.module.js";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware.js";
import { AuditInterceptor } from "./common/interceptors/audit.interceptor.js";

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      name: "short", ttl: 1000, limit: 10,
    }, {
      name: "medium", ttl: 10000, limit: 50,
    }, {
      name: "long", ttl: 60000, limit: 200,
    }]),
    PrismaModule, AppConfigModule, AuthModule, HealthModule,
    UsersModule, TripsModule, ServicesModule, BookingsModule,
    NotificationsModule, SupportModule, LocationsModule, RedisModule, QueuesModule, RefundsModule, CommissionsModule, StaffModule, AuditLogsModule, FeatureFlagsModule, SearchModule, PaymentsModule, AnalyticsModule,
  ],
  providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}