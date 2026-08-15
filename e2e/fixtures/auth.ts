import { execSync } from "node:child_process";

export async function getLatestOtp(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const logs = execSync("docker logs --tail 10 kemraa-api-test 2>&1", { encoding: "utf8" });
      const match = logs.match(/->\s*(\d{6})/g);
      if (match) {
        const last = match[match.length - 1].match(/(\d{6})/);
        if (last) return last[1];
      }
    } catch {}
  }
  throw new Error("Could not capture OTP from docker logs");
}

export const TEST_USER = "customer.ar@kemraa.local";