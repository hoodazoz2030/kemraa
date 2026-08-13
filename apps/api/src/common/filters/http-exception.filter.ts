import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { Response, Request } from "express";
import { randomBytes } from "node:crypto";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId = (req.headers["x-request-id"] as string) ?? randomBytes(8).toString("hex");

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_ERROR";
    let message = "An unexpected error occurred";
    let details: Record<string, unknown> = {};
    let retryable = false;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      if (typeof resp === "object" && resp !== null) {
        code = (resp as any).code ?? code;
        message = (resp as any).message ?? exception.message;
        details = (resp as any).details ?? {};
        retryable = (resp as any).retryable ?? false;
      } else {
        message = resp as string;
      }
    } else if (process.env.NODE_ENV !== "production") {
      const err = exception as any;
      message = err?.message ?? message;
      details = { name: err?.name ?? "Error", firstLines: String(err?.stack ?? "").split("\n").slice(0, 4) };
    }

    if (status >= 500) console.error("[ERROR]", requestId, exception);
    res.status(status).json({ error: { code, message, requestId, details, retryable } });
  }
}