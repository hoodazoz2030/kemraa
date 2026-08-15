import { test, expect } from "@playwright/test";
import { getLatestOtp, TEST_USER } from "../fixtures/auth";

test.describe("Feature Flags", () => {
  test("should toggle a flag and see toast", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    await expect(page).toHaveTitle(/Kemraa/);

    // Login
    const identifierInput = page.locator('input[type="text"]').first();
    await identifierInput.clear();
    await identifierInput.fill(TEST_USER);
    await page.getByRole("button", { name: /Send OTP/i }).click();
    await expect(page.getByText(/OTP sent/i)).toBeVisible({ timeout: 20000 });

    const otp = await getLatestOtp();
    await page.locator('input[maxlength="6"]').fill(otp);
    await page.getByRole("button", { name: /Verify|Sign In/i }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 30000 });

    // Go to feature flags
    await page.getByRole("link", { name: /Feature Flags/i }).click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/feature-flags/);

    // Find first row and its toggle (role="switch" is the toggle button)
    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 15000 });

    // The toggle is a button with a child span that translates
    // It's the only button in the last cell (Action column)
    const lastCell = firstRow.locator("td").last();
    const toggleBtn = lastCell.locator("button").first();
    await expect(toggleBtn).toBeVisible({ timeout: 5000 });

    const classBefore = (await toggleBtn.getAttribute("class")) ?? "";
    const wasEnabled = classBefore.includes("bg-blue-600");
    const flagKey = await firstRow.locator("td").first().locator(".font-mono").innerText();

    // Click the toggle
    await toggleBtn.click();

    // Wait for the TOAST specifically (fixed bottom-right notification)
    // The toast has class containing "fixed bottom-4 right-4"
    const toast = page.locator('[class*="fixed"][class*="bottom"][class*="right"]');
    await expect(toast).toBeVisible({ timeout: 10000 });
    const toastText = await toast.innerText();
    console.log(`✓ Toast appeared: "${toastText}"`);

    await page.waitForTimeout(500);
    const classAfter = (await toggleBtn.getAttribute("class")) ?? "";
    const nowEnabled = classAfter.includes("bg-blue-600");
    expect(nowEnabled).not.toBe(wasEnabled);

    console.log(`✓ Flag "${flagKey}" toggled from ${wasEnabled ? "ON" : "OFF"} to ${nowEnabled ? "ON" : "OFF"}`);
  });
});