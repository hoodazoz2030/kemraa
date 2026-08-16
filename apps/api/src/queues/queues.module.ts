import { Global, Inject, Logger, Module, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import { EmailModule } from "../email/email.module.js";
import { ResendService } from "../auth/resend.service.js";

export const EMAIL_QUEUE = "EMAIL_QUEUE";
const EMAIL_WORKER = "EMAIL_WORKER";

const conn = () => ({ url: process.env.REDIS_URL || "redis://localhost:6379" });

@Global()
@Module({
  imports: [EmailModule],
  providers: [
    {
      provide: EMAIL_QUEUE,
      useFactory: () => new Queue("emails", { connection: conn() }),
    },
    {
      provide: EMAIL_WORKER,
      useFactory: (resend: ResendService) => {
        const logger = new Logger("EmailWorker");
        logger.log("Email worker started (BullMQ)");
        return new Worker(
          "emails",
          async (job) => {
            if (job.name === "send-otp") {
              const d = job.data as { email: string; code: string; ttl: number };
              const r = await resend.sendOtp(d.email, d.code, d.ttl);
              logger.log("send-otp done for " + d.email + " (" + r.mode + ")");
              return r;
            }
          },
          { connection: conn(), concurrency: 5 },
        );
      },
      inject: [ResendService],
    },
  ],
  exports: [EMAIL_QUEUE],
})
export class QueuesModule implements OnModuleDestroy {
  constructor(
    @Inject(EMAIL_QUEUE) private readonly queue: Queue,
    @Inject(EMAIL_WORKER) private readonly worker: Worker,
  ) {}
  async onModuleDestroy() {
    await this.queue.close();
    await this.worker.close();
  }
}
