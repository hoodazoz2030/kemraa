export function formatMoney(minor: number, currency = "EGP"): string {
  return `${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${currency}`;
}
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}