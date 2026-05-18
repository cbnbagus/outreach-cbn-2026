"use client";
import { useOrgStore } from "@/store/org-store";
import { useAuthStore } from "@/store/auth-store";
import { isFeatureAvailable, getMinimumPlanForFeature, getPlanConfig, FEATURE_LABELS } from "@/lib/plans";
import type { FeatureKey } from "@/lib/plans";
import type { PlanTier } from "@/types";
import { Lock, Sparkles, ArrowRight, Mail, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  inline?: boolean;
  message?: string;
}

export function FeatureGate({ feature, children, inline, message }: FeatureGateProps) {
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const isPlatformAdmin = useAuthStore((s) => s.currentUser?.isPlatformAdmin ?? false);
  const plan = (activeOrg?.plan ?? "free") as PlanTier;
  const available = isFeatureAvailable(plan, feature);

  // Platform admin always has full access
  if (available || isPlatformAdmin) return <>{children}</>;

  const requiredPlan = getMinimumPlanForFeature(feature);
  const requiredConfig = getPlanConfig(requiredPlan);
  const featureLabel = FEATURE_LABELS[feature] ?? feature;

  // Determine gate mode based on current plan
  // Free: full lock with upgrade prompt
  // Starter/Growth: "Request Setup" mode (they can upgrade or request help)
  const isRequestMode = plan === "starter" || plan === "growth";

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
      <div className="pointer-events-none select-none opacity-30 blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg p-8 max-w-sm w-full mx-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">{featureLabel}</h3>
          <p className="text-sm text-gray-500 mb-4">
            {message ?? `This feature is available on the ${requiredConfig.name} plan and above.`}
          </p>
          <div className="flex items-center justify-center gap-1.5 mb-5">
            <Sparkles size={14} className="text-amber-500" />
            <span className="text-xs font-medium text-amber-600">
              {requiredConfig.price > 0 ? `Starting at $${requiredConfig.price}/mo` : "Contact sales for pricing"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/dashboard/billing">
              <Button className="w-full gap-2">
                Upgrade to {requiredConfig.name} <ArrowRight size={16} />
              </Button>
            </Link>
            {isRequestMode && (
              <a href="mailto:outreach@cbn.or.id?subject=Setup%20Request%20-%20${encodeURIComponent(featureLabel)}" target="_blank">
                <Button variant="outline" className="w-full gap-2">
                  <Wrench size={14} /> Request Setup Assistance
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * SetupRequestGate — for features that are available on the plan
 * but require setup assistance (Starter/Growth can see but need help to configure)
 */
interface SetupRequestGateProps {
  plan: PlanTier;
  selfServiceMinPlan: PlanTier; // minimum plan for self-service config
  featureLabel: string;
  setupFee?: string;
  description?: string;
  children: React.ReactNode;
}

const TIER_ORDER: PlanTier[] = ["free", "starter", "growth", "enterprise"];

export function SetupRequestGate({ plan, selfServiceMinPlan, featureLabel, setupFee, description, children }: SetupRequestGateProps) {
  const isPlatformAdmin = useAuthStore((s) => s.currentUser?.isPlatformAdmin ?? false);
  const canSelfService = isPlatformAdmin || TIER_ORDER.indexOf(plan) >= TIER_ORDER.indexOf(selfServiceMinPlan);

  if (canSelfService) return <>{children}</>;

  const isChannelIntegration = featureLabel === "Channel Integration";

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-20 blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-white/95 backdrop-blur-sm border border-blue-200 rounded-2xl shadow-lg p-6 max-w-md w-full mx-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
            <Wrench size={22} className="text-blue-600" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">Setup Required</h3>
          <p className="text-sm text-gray-500 mb-3">
            {description ?? `${featureLabel} configuration is available on your plan, but requires setup assistance from our team.`}
          </p>
          {isChannelIntegration && (
            <div className="text-left mb-4 space-y-2">
              <div className="p-2.5 rounded-lg bg-green-50 border border-green-200">
                <p className="text-[11px] font-semibold text-green-800">Option A: Fonnte (Quick Setup) — $29</p>
                <p className="text-[10px] text-green-700">Connect via QR code, works in minutes. Unofficial WhatsApp API. No attachments, no blasting. Best for getting started fast.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-[11px] font-semibold text-blue-800">Option B: Meta Cloud API (Official) — $49</p>
                <p className="text-[10px] text-blue-700">Official WhatsApp Business API. Professional, no watermark, verified badge. Requires Meta Business verification (1-2 weeks for approval).</p>
              </div>
            </div>
          )}
          {!isChannelIntegration && setupFee && (
            <p className="text-xs text-blue-600 font-medium mb-4">One-time setup fee: {setupFee}</p>
          )}
          <div className="flex flex-col gap-2">
            <a href={`mailto:outreach@cbn.or.id?subject=Setup Request: ${encodeURIComponent(featureLabel)}&body=Hi, I would like to set up ${encodeURIComponent(featureLabel)} for my organization. Please let me know the next steps.`} target="_blank">
              <Button className="w-full gap-2">
                <Mail size={14} /> Request Setup
              </Button>
            </a>
            <Link href="/dashboard/billing">
              <Button variant="ghost" className="w-full text-xs text-muted-foreground">
                Upgrade to self-service →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useFeatureAccess(feature: FeatureKey) {
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const plan = (activeOrg?.plan ?? "free") as PlanTier;
  const canUse = isFeatureAvailable(plan, feature);
  const requiredPlan = getMinimumPlanForFeature(feature);
  return { canUse, plan, requiredPlan, requiredPlanName: getPlanConfig(requiredPlan).name };
}
