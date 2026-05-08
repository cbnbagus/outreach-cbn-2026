"use client";
import { useOrgStore } from "@/store/org-store";
import { isFeatureAvailable, getMinimumPlanForFeature, getPlanConfig, FEATURE_LABELS } from "@/lib/plans";
import type { FeatureKey } from "@/lib/plans";
import type { PlanTier } from "@/types";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  /** Show a compact inline lock instead of full overlay */
  inline?: boolean;
  /** Custom message */
  message?: string;
}

/**
 * FeatureGate — wraps content that requires a specific plan tier.
 * 
 * If the current org's plan includes the feature → renders children normally.
 * If not → shows a beautiful lock overlay with upgrade prompt.
 * 
 * Usage:
 *   <FeatureGate feature="whatsapp">
 *     <WhatsAppSettings />
 *   </FeatureGate>
 */
export function FeatureGate({ feature, children, inline, message }: FeatureGateProps) {
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const plan = (activeOrg?.plan ?? "free") as PlanTier;
  const available = isFeatureAvailable(plan, feature);

  if (available) {
    return <>{children}</>;
  }

  const requiredPlan = getMinimumPlanForFeature(feature);
  const requiredConfig = getPlanConfig(requiredPlan);
  const featureLabel = FEATURE_LABELS[feature] ?? feature;

  if (inline) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
        <Lock size={14} className="shrink-0" />
        <span className="text-xs">
          {featureLabel} requires <strong>{requiredConfig.name}</strong> plan.{" "}
          <Link href="/dashboard/billing" className="underline font-medium">Upgrade</Link>
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Blurred/faded content behind — user can see but not interact */}
      <div className="pointer-events-none select-none opacity-30 blur-[1px]">
        {children}
      </div>
      
      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg p-8 max-w-sm w-full mx-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-amber-600" />
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            {featureLabel}
          </h3>
          
          <p className="text-sm text-gray-500 mb-4">
            {message ?? `This feature is available on the ${requiredConfig.name} plan and above.`}
          </p>

          <div className="flex items-center justify-center gap-1.5 mb-5">
            <Sparkles size={14} className="text-amber-500" />
            <span className="text-xs font-medium text-amber-600">
              Starting at{" "}
              {requiredConfig.price.idr > 0
                ? `Rp ${(requiredConfig.price.idr / 1000).toFixed(0)}K/mo`
                : `$${requiredConfig.price.usd}/mo`
              }
            </span>
          </div>

          <Link href="/dashboard/billing">
            <Button className="w-full gap-2">
              Upgrade to {requiredConfig.name} <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * useFeatureAccess — hook for programmatic feature checking.
 * 
 * Usage:
 *   const { canUse, requiredPlan } = useFeatureAccess("whatsapp");
 *   if (!canUse) showUpgradePrompt();
 */
export function useFeatureAccess(feature: FeatureKey) {
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const plan = (activeOrg?.plan ?? "free") as PlanTier;
  const canUse = isFeatureAvailable(plan, feature);
  const requiredPlan = getMinimumPlanForFeature(feature);

  return {
    canUse,
    plan,
    requiredPlan,
    requiredPlanName: getPlanConfig(requiredPlan).name,
  };
}
