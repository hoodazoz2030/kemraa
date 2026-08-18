import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException,
  HttpStatus, BadRequestException, UnauthorizedException,
  ForbiddenException, NotFoundException, ConflictException,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

/**
 * §10 — Unified Error Format
 * {
 *   error: {
 *     code, message, requestId, details, retryable
 *   }
 * }
 * No stack traces leaked to clients.
 */
@Catch()
export class UnifiedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(UnifiedExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as any)?.requestId || `req_unknown_${Date.now()}`;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_ERROR";
    let message = "An unexpected error occurred";
    let retryable = false;
    let details: any = undefined;

    if (exception instanceof BadRequestException) {
      status = HttpStatus.BAD_REQUEST;
      code = "BAD_REQUEST";
      const resp: any = exception.getResponse();
      if (typeof resp === "string") {
        message = resp;
      } else if (resp?.message) {
        message = Array.isArray(resp.message) ? resp.message.join("; ") : resp.message;
        details = resp.errors;
      }
      code = resp?.code || code;
    } else if (exception instanceof UnauthorizedException) {
      status = HttpStatus.UNAUTHORIZED;
      code = "UNAUTHORIZED";
      message = "Authentication required or invalid credentials";
    } else if (exception instanceof ForbiddenException) {
      status = HttpStatus.FORBIDDEN;
      code = "FORBIDDEN";
      message = "You do not have permission to perform this action";
    } else if (exception instanceof NotFoundException) {
      status = HttpStatus.NOT_FOUND;
      code = "NOT_FOUND";
      message = exception.message || "Resource not found";
    } else if (exception instanceof ConflictException) {
      status = HttpStatus.CONFLICT;
      code = "CONFLICT";
      message = exception.message || "Resource conflict";
      retryable = true;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp: any = exception.getResponse();
      code = resp?.code || `HTTP_${status}`;
      message = typeof resp === "string" ? resp : resp?.message || exception.message;
      if (Array.isArray(message)) message = message.join("; ");
    } else if (exception instanceof Error) {
      // Log full error internally, never leak stack
      this.logger.error(
        `Unhandled error [${requestId}]: ${exception.message}`,
        exception.stack,
      );
      code = "INTERNAL_ERROR";
      message = "An unexpected error occurred";
      retryable = true;
    }

    // Map common codes for domain readability
    const codeMap: Record<string, string> = {
      "Invalid transition": "INVALID_STATE_TRANSITION",
      "Actor": "FORBIDDEN_TRANSITION",
      "not found": "NOT_FOUND",
      "already": "CONFLICT",
      "must be": "VALIDATION_ERROR",
    };
    for (const [pattern, mapped] of Object.entries(codeMap)) {
      if (message.toLowerCase().includes(pattern.toLowerCase())) {
        code = mapped;
        break;
      }
    }

    response.status(status).json({
      error: {
        code,
        message,
        requestId,
        details: details ?? {},
        retryable,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}
