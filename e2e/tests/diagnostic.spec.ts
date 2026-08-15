import { test, expect } from "@playwright/test";

test("DIAG: what does playwright actually see?", async ({ page }) => {
  const url = process.env.ADMIN_URL ?? "http://localhost:3000";
  console.log(`\n[DIAG] baseURL: ${url}`);
  
  // Try visiting multiple paths
  const paths = ["/", "/login", "/audit-logs"];
  
  for (const path of paths) {
    console.log(`\n[DIAG] Navigating to ${path}...`);
    try {
      const response = await page.goto(url + path, { waitUntil: "domcontentloaded", timeout: 30000 });
      console.log(`[DIAG] Status: ${response?.status()}, URL after: ${page.url()}`);
      
      // Save screenshot
      await page.screenshot({ path: `diag-${path.replace(/\//g, "_") || "root"}.png`, fullPage: true });
      
      // Dump title + body text
      const title = await page.title();
      const bodyText = await page.locator("body").innerText().catch(() => "(empty)");
      console.log(`[DIAG] Title: "${title}"`);
      console.log(`[DIAG] Body text (first 200 chars): ${bodyText.slice(0, 200).replace(/\n/g, " ")}`);
      
      // Check for common Next.js errors
      const hasError = await page.locator("text=/Application error|500|Not Found/i").count();
      if (hasError > 0) console.log(`[DIAG] ⚠ Page shows error!`);
      
      // Check for login form elements
      const emailInput = await page.getByPlaceholder("your@email.com").count();
      const heading = await page.locator("h1").count();
      console.log(`[DIAG] Email inputs: ${emailInput}, H1 tags: ${heading}`);
      
    } catch (err: any) {
      console.log(`[DIAG] ✗ Navigation failed: ${err.message.slice(0, 200)}`);
    }
  }
  
  // Final pass — don't fail the test, just diagnostic
  expect(true).toBe(true);
});