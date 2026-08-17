import re

path = r"D:\kemraa\apps\admin\src\lib\api.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# احذف كل نسخ financeApi (باستخدام regex أكثر دقة)
# Pattern: من // ==== Finance ==== إلى }; الـ matching
pattern = r'(?ms)^\s*//\s*=+\s*Finance\s*=+\s*\n\s*export\s+const\s+financeApi\s*=\s*\{.*?^\};\s*$'
content = re.sub(pattern, '', content)

# تحقق
count = content.count('export const financeApi')
print(f"After cleanup: {count} financeApi occurrences (should be 0)")

# أضف نسخة واحدة كاملة في الآخر
finance_block = """

// ============ Finance ============
export const financeApi = {
  summary: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    return api.get(`/payments/admin/summary?${q.toString()}`).then((r: any) => r.data);
  },
  commissions: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    return api.get(`/payments/admin/commissions?${q.toString()}`).then((r: any) => r.data);
  },
  taxFiling: (month: string) =>
    api.get(`/payments/admin/tax-filing?month=${month}`).then((r: any) => r.data),
  testWebhook: (provider: string) =>
    api.post(`/payments/test-webhook`, { provider }).then((r: any) => r.data),
  exportCsv: async (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const res = await api.get(`/payments/admin/export/csv?${q.toString()}`, { responseType: "blob" });
    const url = URL.createObjectURL((res as any).data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kemraa-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
"""

final = content.rstrip() + finance_block
final_count = final.count('export const financeApi')
print(f"Final: {final_count} financeApi occurrence(s) (must be 1)")

with open(path, "w", encoding="utf-8") as f:
    f.write(final)

print("✓ api.ts cleaned and financeApi added")