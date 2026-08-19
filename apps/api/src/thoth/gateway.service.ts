import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { ThothPolicyEngine } from "./policy-engine.service.js";
import { ThothContextLoader } from "./context-loader.service.js";
import { ThothToolExecutor } from "./tool-executor.service.js";
import { randomUUID } from "node:crypto";

/**
 * §13 — THOTH Gateway (full pipeline)
 * Uses a mock LLM in dev; production wires to Claude via AI_API_KEY.
 */
@Injectable()
export class ThothGatewayService {
  private readonly logger = new Logger(ThothGatewayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: ThothPolicyEngine,
    private readonly context: ThothContextLoader,
    private readonly executor: ThothToolExecutor,
  ) {}

  async chat(params: {
    sessionId?: string;
    userId?: string;
    userRoles?: string[];
    message: string;
  }) {
    const startedAt = Date.now();
    const sessionId = params.sessionId || randomUUID();

    // 1) Save user message
    await this.prisma.thothChatMessage.create({
      data: {
        sessionId,
        userId: params.userId ?? null,
        role: "user",
        content: params.message,
        status: "COMPLETED",
      },
    });

    // 2) Load context
    const ctx = await this.context.load(params.userId, sessionId);

    // 3) Get allowed tools
    const tools = await this.prisma.thothTool.findMany({ where: { enabled: true } });
    const toolNames = tools.map((t: any) => t.name);

    // 4) Mock LLM decides what tool to call
    const toolCall = this.mockLLMPlan(params.message, toolNames);

    // 5) If no tool, return text response
    if (!toolCall) {
      const reply = `أنا THOTH، مساعدك الذكي في KEMRAA. يمكنني مساعدتك في:
- البحث عن خدمات (فنادق، مطاعم، تجارب)
- إنشاء مسودة رحلة
- حساب الميزانية
- حجز رحلة/تاكسي
- معرفة معلومات عن الوجهات

ما الذي تود القيام به؟`;
      await this.prisma.thothChatMessage.create({
        data: {
          sessionId,
          userId: params.userId ?? null,
          role: "assistant",
          content: reply,
          status: "COMPLETED",
          durationMs: Date.now() - startedAt,
        },
      });
      return { sessionId, reply, toolCalls: [], context: ctx };
    }

    // 6) Policy check
    const policyResult = await this.policy.evaluate({
      toolName: toolCall.tool,
      userId: params.userId,
      userRoles: params.userRoles,
      payload: toolCall.payload,
    });

    // 7) If approval required -> create PENDING action
    if (policyResult.requiresApproval) {
      const action = await this.prisma.thothAction.create({
        data: {
          toolName: toolCall.tool,
          riskLevel: policyResult.riskLevel,
          status: "PENDING",
          payload: toolCall.payload,
          requestedBy: params.userId ?? null,
        },
      });
      const reply = `⚠️ هذا الإجراء يتطلب موافقة (${policyResult.riskLevel}). تم إرسال الطلب للإدارة.\nAction ID: ${action.id}`;
      await this.prisma.thothChatMessage.create({
        data: {
          sessionId,
          userId: params.userId ?? null,
          role: "assistant",
          content: reply,
          toolCalls: [{ tool: toolCall.tool, status: "PENDING_APPROVAL", actionId: action.id }] as any,
          riskLevel: policyResult.riskLevel,
          status: "AWAITING_APPROVAL",
          durationMs: Date.now() - startedAt,
        },
      });
      return {
        sessionId,
        reply,
        toolCalls: [{ tool: toolCall.tool, status: "PENDING_APPROVAL", actionId: action.id }],
        riskLevel: policyResult.riskLevel,
      };
    }

    // 8) If not allowed -> reject
    if (!policyResult.allowed) {
      const reply = `❌ غير مسموح: ${policyResult.reason}`;
      await this.prisma.thothChatMessage.create({
        data: {
          sessionId,
          userId: params.userId ?? null,
          role: "assistant",
          content: reply,
          riskLevel: "BLOCKED",
          status: "BLOCKED",
          durationMs: Date.now() - startedAt,
        },
      });
      return { sessionId, reply, toolCalls: [], riskLevel: "BLOCKED" };
    }

    // 9) Execute tool
    const execResult = await this.executor.execute({
      toolName: toolCall.tool,
      payload: toolCall.payload,
      userId: params.userId,
    });

    // 10) Format response
    let reply: string;
    if (execResult.success) {
      reply = `✅ تم تنفيذ "${toolCall.tool}" بنجاح:\n\`\`\`json\n${JSON.stringify(execResult.result, null, 2)}\n\`\`\``;
    } else {
      reply = `❌ فشل التنفيذ: ${execResult.error}`;
    }

    await this.prisma.thothChatMessage.create({
      data: {
        sessionId,
        userId: params.userId ?? null,
        role: "assistant",
        content: reply,
        toolCalls: [{ tool: toolCall.tool, payload: toolCall.payload }] as any,
        toolResults: execResult as any,
        riskLevel: policyResult.riskLevel,
        status: "COMPLETED",
        durationMs: Date.now() - startedAt,
      },
    });

    return {
      sessionId,
      reply,
      toolCalls: [{ tool: toolCall.tool, payload: toolCall.payload }],
      toolResults: execResult,
      riskLevel: policyResult.riskLevel,
    };
  }

  /**
   * Mock LLM planner (keyword-based). Production: replaced by Claude function calling.
   * Order matters: specific keywords (ride/taxi) BEFORE generic ones (كام/budget).
   */
  private mockLLMPlan(message: string, toolNames: string[]): { tool: string; payload: any } | null {
    const m = message.toLowerCase();

    // 1. Ride/taxi FIRST (specific keywords — before generic "كام")
    const rideKeywords = ["تاكسي", "taxi", "مواصلات", "مطار", "airport", "توصيلة", "كابتن", "ride", "uber", "careem", "pickup", "dropoff"];
    if (rideKeywords.some((k) => m.includes(k))) {
      return { tool: "estimate_ride", payload: { distanceKm: 15 } };
    }

    // 2. Payment (HIGH risk)
    const paymentKeywords = ["دفع", "payment", "pay", "ادفع", "checkout", "بطاقة"];
    if (paymentKeywords.some((k) => m.includes(k))) {
      return { tool: "create_payment_intent", payload: { amountMinor: 50000, currency: "EGP" } };
    }

    // 3. Booking (HIGH risk)
    const bookingKeywords = ["حجز", "book", "احجز", "reserve"];
    if (bookingKeywords.some((k) => m.includes(k))) {
      return { tool: "create_booking_draft", payload: {} };
    }

    // 4. Itinerary/trip creation (MEDIUM)
    const tripKeywords = ["رحلة", "trip", "سفرة", "اعمل رحلة", "itinerary", "برنامج"];
    if (tripKeywords.some((k) => m.includes(k))) {
      return { tool: "create_itinerary_draft", payload: { title: "رحلة إلى الأقصر", destination: "EG", nights: 4 } };
    }

    // 5. Budget calc (LOW)
    const budgetKeywords = ["ميزانية", "budget", "كام", "تكلفة", "cost", "price"];
    if (budgetKeywords.some((k) => m.includes(k))) {
      return { tool: "calculate_budget", payload: { nights: 5, perNightMinor: 150000, currency: "EGP" } };
    }

    // 6. Search (LOW)
    const searchKeywords = ["بحث", "search", "ابحث", "فندق", "مطعم", "تجربة", "hotel", "restaurant"];
    if (searchKeywords.some((k) => m.includes(k))) {
      return { tool: "search_services", payload: { type: "HOTEL" } };
    }

    // 7. Support (MEDIUM)
    const supportKeywords = ["دعم", "support", "مشكلة", "شكوى", "help"];
    if (supportKeywords.some((k) => m.includes(k))) {
      return { tool: "create_support_ticket", payload: { subject: message.slice(0, 100), body: message, category: "OTHER" } };
    }

    // 8. Destination knowledge (LOW)
    const destKeywords = ["وجهة", "معلومات", "destination", "اعرف", "about"];
    if (destKeywords.some((k) => m.includes(k))) {
      return { tool: "search_destination_knowledge", payload: { destination: "Egypt" } };
    }

    return null;
  }

  async getHistory(userId?: string, sessionId?: string, limit = 50) {
    const where: any = {};
    if (userId) where.userId = userId;
    if (sessionId) where.sessionId = sessionId;
    return this.prisma.thothChatMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async getSessions(limit = 20) {
    const sessions = await this.prisma.thothChatMessage.groupBy({
      by: ["sessionId"],
      _count: { id: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
      take: limit,
    });
    return sessions;
  }

  async getStats() {
    const [total, byStatus, byRisk] = await Promise.all([
      this.prisma.thothChatMessage.count(),
      this.prisma.thothChatMessage.groupBy({ by: ["status"], _count: { id: true } }),
      this.prisma.thothChatMessage.groupBy({ by: ["riskLevel"], _count: { id: true } }),
    ]);
    return {
      total,
      byStatus: byStatus.reduce((acc: any, s: any) => ({ ...acc, [s.status || "null"]: s._count.id }), {}),
      byRisk: byRisk.reduce((acc: any, s: any) => ({ ...acc, [s.riskLevel || "null"]: s._count.id }), {}),
    };
  }
}
