import clsx from "clsx";

const COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PLANNING: "bg-amber-100 text-amber-700",
  READY: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
  REJECTED: "bg-red-100 text-red-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  PAYMENT_PENDING: "bg-orange-100 text-orange-700",
  CONFIRMING: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  PAUSED: "bg-amber-100 text-amber-700",
  ARCHIVED: "bg-gray-200 text-gray-600",
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-200 text-gray-600",
  WAITING: "bg-amber-100 text-amber-700",
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
  CRITICAL: "bg-red-200 text-red-800",
  QUEUED: "bg-gray-100 text-gray-700",
  SENT: "bg-green-100 text-green-700",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx("px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap", COLORS[status] ?? "bg-gray-100 text-gray-700")}>
      {status}
    </span>
  );
}