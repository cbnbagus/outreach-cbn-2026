import { cn } from "@/lib/utils";
import type { TicketStatus, TicketPriority } from "@/types";

const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { label: "In Progress", className: "bg-amber-100 text-amber-700 border-amber-200" },
  resolved: { label: "Resolved", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  closed: { label: "Closed", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

const priorityConfig: Record<TicketPriority, { label: string; className: string }> = {
  high: { label: "High", className: "bg-red-100 text-red-700 border-red-200" },
  medium: { label: "Medium", className: "bg-amber-100 text-amber-700 border-amber-200" },
  low: { label: "Low", className: "bg-slate-100 text-slate-500 border-slate-200" },
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border", config.className)}>
      {config.label}
    </span>
  );
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  const config = priorityConfig[priority];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border", config.className)}>
      {config.label}
    </span>
  );
}
