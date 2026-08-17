import re
path = r"D:\kemraa\apps\admin\src\lib\api.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove ALL occurrences of the financeApi block
# Pattern: from "// ============ Finance ============" to the closing "};"
pattern = r'(?s)\n*// ============ Finance ============\s*\nexport const financeApi\s*=\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\};\s*'
cleaned = re.sub(pattern, '', content)

# Count remaining
count = cleaned.count('export const financeApi')
print(f"Remaining financeApi occurrences: {count}")

# Add ONE clean version at the end
new_block = """

// ============ Finance ============
export const financeApi = {
  summary: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    return api.get(`/payments/admin/summary?${q.toString()}`).then((r) => r.data);
  },
  commissions: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    return api.get(`/payments/admin/commissions?${q.toString()}`).then((r) => r.data);
  },
  taxFiling: (month: string) =>
    api.get(`/payments/admin/tax-filing?month=${month}`).then((r) => r.data),
  exportCsv: async (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const res = await api.get(`/payments/admin/export/csv?${q.toString()}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kemraa-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
"""

final = cleaned.rstrip() + new_block
final_count = final.count('export const financeApi')
print(f"Final financeApi count: {final_count} (should be 1)")

with open(path, "w", encoding="utf-8") as f:
    f.write(final)

print("✓ api.ts cleaned")