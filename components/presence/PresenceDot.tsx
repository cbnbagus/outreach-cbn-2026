import { cn } from "@/lib/utils";
import type { OnlineStatus } from "@/types";

interface PresenceDotProps {
  status:    OnlineStatus;
  size?:     "sm" | "md" | "lg";
  className?: string;
}

export const STATUS_COLOR: Record<OnlineStatus, string> = {
  online:  "bg-emerald-500",
  busy:    "bg-rose-500",
  away:    "bg-amber-400",
  offline: "bg-slate-400",
};

export const STATUS_LABEL: Record<OnlineStatus, string> = {
  online:  "Online",
  busy:    "Busy",
  away:    "Away",
  offline: "Offline",
};

const SIZE: Record<string, string> = {
  sm: "w-1.5 h-1.5",
  md: "w-2   h-2",
  lg: "w-2.5 h-2.5",
};

export function PresenceDot({ status, size = "md", className }: PresenceDotProps) {
  return (
    <span
      className={cn(
        "rounded-full flex-shrink-0 ring-1 ring-background",
        STATUS_COLOR[status],
        SIZE[size],
        status === "online" && "animate-pulse",
        className
      )}
      title={STATUS_LABEL[status]}
    />
  );
}
