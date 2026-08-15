import { test, expect } from "@playwright/test";
import { getLatestOtp, TEST_USER } from "../fixtures/auth";

test.describe("Login + Audit Logs", () => {
  test("should login with OTP and view audit logs", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    
    // Verify Kemraa admin page (NOT RestOps!)
    await expect(page).toHaveTitle(/Kemraa/);
    
    // Find the email/phone input (first text input on the page)
    const identifierInput = page.locator('input[type="text"]').first();
    await expect(identifierInput).toBeVisible({ timeout: 10000 });
    
    // Clear and fill
    await identifierInput.clear();
    await identifierInput.fill(TEST_USER);
    
    // Click Send OTP (first submit button)
    await page.getByRole("button", { name: /Send OTP/i }).click();
    await expect(page.getByText(/OTP sent/i)).toBeVisible({ timeout: 20000 });
    
    // Get OTP from docker logs
    const otp = await getLatestOtp();
    console.log(`E2E captured OTP: ${otp}`);
    
    // Enter OTP
    const otpInput = page.locator('input[maxlength="6"]');
    await otpInput.fill(otp);
    
    // Click Verify
    await page.getByRole("button", { name: /Verify|Sign In/i }).click();
    
    // Should redirect away from login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 30000 });
    
    // Navigate to Audit Logs
    await page.getByRole("link", { name: /Audit Logs/i }).click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/audit-logs/);
    
    // Verify table
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    console.log(`✓ Audit logs: ${rowCount} rows visible`);
  });
});