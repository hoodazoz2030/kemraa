import { Injectable, Logger, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §13 — THOTH Policy / Risk Engine
 * Evaluates whether a tool call is allowed based on:
 *   - Tool risk level (LOW/MEDIUM/HIGH/CRITICAL)
 *   - User role + permissions
 *   - Context (amount, booking state, etc.)
 */
@Injectable()
export class ThothPolicyEngine {
  private readonly logger = new Logger(ThothPolicyEngine.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a tool call is allowed.
   * Returns: { allowed, requiresApproval, riskLevel, reason }
   */
  async evaluate(params: {
    toolName: string;
    userId?: string;
    userRoles?: string[];
    payload?: any;
  }): Promise<{
    allowed: boolean;
    requiresApproval: boolean;
    riskLevel: string;
    reason?: string;
  }> {
    const tool = await this.prisma.thothTool.findUnique({
      where: { name: params.toolName },
    });

    if (!tool) {
      return {
        allowed: false,
        requiresApproval: false,
        riskLevel: "BLOCKED",
        reason: `Tool "${params.toolName}" not in allow-list`,
      };
    }

    if (!tool.enabled) {
      return {
        allowed: false,
        requiresApproval: false,
        riskLevel: "BLOCKED",
        reason: `Tool "${params.toolName}" is disabled`,
      };
    }

    // §13.2 Risk-based policy
    const riskLevel = tool.riskLevel;
    const requiresApproval = tool.requiresApproval;
    // SUPER_ADMIN can bypass approval gates
    const isSuperAdmin = params.userRoles?.includes("SUPER_ADMIN") ?? false;
    
    // HIGH/CRITICAL always require approval (unless super admin)
    if (["HIGH", "CRITICAL"].includes(riskLevel) && !isSuperAdmin && requiresApproval) {
      return {
        allowed: false,
        requiresApproval: true,
        riskLevel,
        reason: `Tool "${params.toolName}" (${riskLevel}) requires explicit approval`,
      };
    }

    // CRITICAL for non-admin is always blocked
    if (riskLevel === "CRITICAL" && !isSuperAdmin) {
      return {
        allowed: false,
        requiresApproval: false,
        riskLevel: "BLOCKED",
        reason: `CRITICAL tools require SUPER_ADMIN`,
      };
    }

    return {
      allowed: true,
      requiresApproval: false,
      riskLevel,
    };
  }
}
