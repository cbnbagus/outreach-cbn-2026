"use client";
import { useOrgStore } from "@/store/org-store";
import { getPlanConfig, getUsagePercentage, GRACE_PERIOD_DAYS } from "@/lib/plans";
import type { PlanTier } from "@/types";
import { AlertTriangle, ArrowRight, TrendingUp } from "lucide-react";

/**
 * UsageBanner — shows in dashboard layout when usage is approaching or exceeding limits.
 * 
 * - 80%+ usage: yellow warning
 * - 100%+ usage: red warning with grace period countdown
 */
export function UsageBanner() {
  const activeOrg = useOrgStore((s) => s.activeOrg);
  if (!activeOrg) return null;

  const plan = (activeOrg.plan ?? "free") as PlanTier;
  const config = getPlanConfig(plan);
  const usage = activeOrg.usage;

  if (!usage) return null;

  // Check each metric
  const metrics = [
    { label: "Respondents", current: usage.currentRespondents ?? 0, max: config.maxRespondents, key: "respondents" },
    { label: "AI Conversations", current: usage.aiConversationsThisMonth ?? 0, max: config.maxAIConversations, key: "ai" },
    { label: "WhatsApp Conversations", current: usage.waConversationsThisMonth ?? 0, max: config.maxWhatsAppConversations, key: "wa" },
  ];

  const warnings = metrics.filter(m => m.max > 0 && (m.current / m.max) >= 0.8);
  const exceeded = metrics.filter(m => m.max > 0 && m.current >= m.max);

  if (warnings.length === 0 && exceeded.length === 0) return null;

  const isExceeded = exceeded.length > 0;

  return (
    <div className={`px-4 py-2.5 flex items-center gap-3 text-xs ${
      isExceeded 
        ? "bg-red-50 border-b border-red-200 text-red-700" 
        : "bg-amber-50 border-b border-amber-200 text-amber-700"
    }`}>
      {isExceeded ? (
        <AlertTriangle size={16} className="shrink-0" />
      ) : (
        <TrendingUp size={16} className="shrink-0" />
      )}
      
      <div className="flex-1">
        {isExceeded ? (
          <span>
            <strong>Limit exceeded:</strong>{" "}
            {exceeded.map(m => `${m.label} (${m.current}/${m.max})`).join(", ")}.{" "}
            Contact admin to increase your limits.
          </span>
        ) : (
          <span>
            <strong>Approaching limit:</strong>{" "}
            {warnings.map(m => `${m.label} at ${Math.round((m.current / m.max) * 100)}%`).join(", ")}.{" "}
            Contact admin if you need higher limits.
          </span>
        )}
      </div>

      <a href="mailto:outreach@cbn.or.id" className="shrink-0 flex items-center gap-1 font-semibold hover:underline">
        Contact Admin <ArrowRight size={12} />
      </a>
    </div>
  );
}
