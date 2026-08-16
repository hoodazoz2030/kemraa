import { Injectable, Logger } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { APP_CONFIG } from "../config/config.module.js";
import { AppConfig } from "../config/app.config.js";
import { Resend } from "resend";

@Injectable()
export class ResendService {
  private readonly logger = new Logger(ResendService.name);
  private readonly client: Resend | null;
  private readonly fromEmail: string;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && apiKey.length > 10) {
      this.client = new Resend(apiKey);
      this.fromEmail = process.env.RESEND_FROM_EMAIL ?? "Kemraa <onboarding@resend.dev>";
      this.logger.log("Resend client initialized (from: " + this.fromEmail + ")");
    } else {
      this.client = null;
      this.fromEmail = "";
      this.logger.warn("RESEND_API_KEY not set — falling back to console logging");
    }
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  async sendOtp(email: string, code: string, expiresInSec: number): Promise<{ sent: boolean; mode: "resend" | "console" }> {
    const mins = Math.floor(expiresInSec / 60);
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #FFFFFF; border: 1px solid rgba(201, 162, 39, 0.3); border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 8px 16px; background: linear-gradient(90deg, #C9A227, #E6C55C); border-radius: 6px; color: #0C0A06; font-weight: bold; font-size: 14px; letter-spacing: 1px;">
            🏺 KEMRAA
          </div>
        </div>
        <h1 style="color: #0C0A06; font-size: 22px; margin: 0 0 8px 0; text-align: center;">Your verification code</h1>
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0; text-align: center;">Use this code to sign in to your account</p>
        <div style="background: linear-gradient(135deg, #F0D78C 0%, #E6C55C 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #0C0A06; font-family: monospace;">
            ${code}
          </div>
        </div>
        <p style="color: #6b7280; font-size: 13px; text-align: center; margin: 0;">
          This code expires in <strong>${mins} minutes</strong>.<br/>
          If you didn't request this, please ignore this email.
        </p>
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 11px;">
          Kemraa — The Land of the Sun
        </div>
      </div>
    `;

    const text = `Your Kemraa verification code is: ${code}\n\nThis code expires in ${mins} minutes. If you didn't request this, please ignore this email.`;

    if (!this.client) {
      this.logger.log(`[OTP][EMAIL-CONSOLE] ${email} -> ${code} (expires in ${expiresInSec}s)`);
      return { sent: true, mode: "console" };
    }

    try {
      const result = await this.client.emails.send({
        from: this.fromEmail,
        to: email,
        subject: `Your Kemraa code: ${code}`,
        html,
        text,
      });
      this.logger.log(`[OTP][EMAIL-RESEND] ${email} -> ${code} (id: ${result.id})`);
      return { sent: true, mode: "resend" };
    } catch (e: any) {
      this.logger.error(`Failed to send OTP via Resend: ${e.message}`);
      // Fallback to console so dev doesn't break
      this.logger.log(`[OTP][EMAIL-FALLBACK] ${email} -> ${code}`);
      return { sent: true, mode: "console" };
    }
  }
}