"use client";
import { useOrgStore } from "@/store/org-store";
import { PLAN_CONFIGS, getPlanConfig, FEATURE_LABELS, getUsagePercentage } from "@/lib/plans";
import type { PlanTier } from "@/types";
import type { FeatureKey } from "@/lib/plans";
import { Check, X, Crown, Sparkles, ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tierOrder: PlanTier[] = ["free", "starter", "growth", "enterprise"];

export default function BillingPage() {
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const currentPlan = (activeOrg?.plan ?? "free") as PlanTier;
  const currentConfig = getPlanConfig(currentPlan);
  const usage = activeOrg?.usage;

  const usageMetrics = [
    { label: "Team Members", current: usage?.currentUsers ?? 0, max: currentConfig.maxUsers },
    { label: "Respondents", current: usage?.currentRespondents ?? 0, max: currentConfig.maxRespondents },
    { label: "AI Conversations / month", current: usage?.aiConversationsThisMonth ?? 0, max: currentConfig.maxAIConversations },
    { label: "WhatsApp Conversations / month", current: usage?.waConversationsThisMonth ?? 0, max: currentConfig.maxWhatsAppConversations },
  ];

  const featureGroups: { title: string; features: FeatureKey[] }[] = [
    {
      title: "Channels",
      features: ["websiteChat", "whatsapp", "instagram", "facebook", "youtube"],
    },
    {
      title: "AI & Automation",
      features: ["aiAutoReply", "aiCounseling24_7", "advancedAIModel", "escalationTriggers"],
    },
    {
      title: "Management",
      features: ["teamManagement", "customProgressSteps", "customProgramSources", "socialInbox", "callFeature", "schedule"],
    },
    {
      title: "Analytics & Export",
      features: ["reporting", "advancedReporting", "exportCSV"],
    },
    {
      title: "Premium",
      features: ["customBranding", "apiAccess", "prioritySupport", "dedicatedSupport", "sla"],
    },
  ];

  const handleUpgrade = (tier: PlanTier) => {
    if (tier === "enterprise") {
      window.open("mailto:hello@reachthesoul.org?subject=Enterprise Plan Inquiry&body=Hi, I'd like to learn more about the Enterprise plan for my organization.", "_blank");
    } else {
      // TODO: integrate payment gateway (Midtrans/Stripe)
      alert(`Payment integration coming soon! To upgrade to ${getPlanConfig(tier).name}, please contact hello@reachthesoul.org`);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Current Plan */}
      <div>
        <h2 className="text-base font-semibold text-foreground">Plan & Billing</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your subscription and monitor usage.
        </p>
      </div>

      {/* Current plan card */}
      <Card className="border-2" style={{ borderColor: currentConfig.color + "40" }}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: currentConfig.color + "15" }}>
                <Crown size={20} style={{ color: currentConfig.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">{currentConfig.name} Plan</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: currentConfig.color }}>
                    CURRENT
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{currentConfig.description}</p>
              </div>
            </div>
            <div className="text-right">
              {currentConfig.price.idr > 0 ? (
                <>
                  <p className="text-2xl font-bold text-foreground">
                    Rp {(currentConfig.price.idr / 1000).toFixed(0)}K
                  </p>
                  <p className="text-[11px] text-muted-foreground">per month</p>
                </>
              ) : currentPlan === "enterprise" ? (
                <p className="text-sm font-medium text-muted-foreground">Custom pricing</p>
              ) : (
                <p className="text-2xl font-bold text-green-600">Free</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage meters */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Current Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {usageMetrics.map(({ label, current, max }) => {
            const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
            const isWarning = pct >= 80;
            const isExceeded = pct >= 100;
            return (
              <Card key={label} className="shadow-none">
                <CardContent className="p-4">
                  <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
                  <div className="flex items-end justify-between mb-2">
                    <p className="text-xl font-bold text-foreground">{current}</p>
                    <p className="text-xs text-muted-foreground">
                      / {max === 0 ? "—" : max.toLocaleString()}
                    </p>
                  </div>
                  {max > 0 && (
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isExceeded ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-green-500"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                  {max === 0 && (
                    <p className="text-[10px] text-muted-foreground italic">Not available on this plan</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Plan comparison */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Compare Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {tierOrder.map((tier) => {
            const config = PLAN_CONFIGS[tier];
            const isCurrent = tier === currentPlan;
            const isUpgrade = tierOrder.indexOf(tier) > tierOrder.indexOf(currentPlan);
            
            return (
              <Card
                key={tier}
                className={cn(
                  "shadow-none relative overflow-hidden",
                  isCurrent && "border-2 ring-1 ring-offset-1",
                )}
                style={isCurrent ? { borderColor: config.color } : {}}
              >
                {tier === "growth" && (
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-bl-lg">
                    POPULAR
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.color }} />
                    <h4 className="text-sm font-bold text-foreground">{config.name}</h4>
                  </div>
                  
                  <div className="mb-3">
                    {config.price.idr > 0 ? (
                      <p className="text-xl font-bold text-foreground">
                        Rp {(config.price.idr / 1000).toFixed(0)}K
                        <span className="text-xs font-normal text-muted-foreground">/mo</span>
                      </p>
                    ) : tier === "enterprise" ? (
                      <p className="text-sm font-medium text-muted-foreground">Contact us</p>
                    ) : (
                      <p className="text-xl font-bold text-green-600">Free</p>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground mb-3">{config.description}</p>

                  {/* Key limits */}
                  <div className="text-[11px] text-foreground space-y-1 mb-4">
                    <p><strong>{config.maxUsers}</strong> {config.maxUsers === 999 ? "unlimited" : ""} users</p>
                    <p><strong>{config.maxRespondents >= 99999 ? "Unlimited" : config.maxRespondents.toLocaleString()}</strong> respondents</p>
                    <p><strong>{config.maxAIConversations === 0 ? "—" : config.maxAIConversations >= 99999 ? "Unlimited" : config.maxAIConversations.toLocaleString()}</strong> AI conversations</p>
                    <p><strong>{config.maxWhatsAppConversations === 0 ? "—" : config.maxWhatsAppConversations >= 99999 ? "Unlimited" : config.maxWhatsAppConversations.toLocaleString()}</strong> WA conversations</p>
                  </div>

                  {isCurrent ? (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : isUpgrade ? (
                    <Button size="sm" className="w-full gap-1.5" onClick={() => handleUpgrade(tier)}>
                      {tier === "enterprise" ? (
                        <><Mail size={14} /> Contact Sales</>
                      ) : (
                        <><Sparkles size={14} /> Upgrade</>
                      )}
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground" disabled>
                      —
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Feature comparison table */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Feature Comparison</h3>
        <Card className="shadow-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left p-3 font-semibold text-foreground min-w-[200px]">Feature</th>
                  {tierOrder.map((tier) => (
                    <th key={tier} className="text-center p-3 font-semibold min-w-[100px]" style={{ color: PLAN_CONFIGS[tier].color }}>
                      {PLAN_CONFIGS[tier].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureGroups.map((group) => (
                  <>
                    <tr key={group.title}>
                      <td colSpan={5} className="px-3 py-2 bg-muted/20 font-semibold text-foreground text-[11px] uppercase tracking-wider">
                        {group.title}
                      </td>
                    </tr>
                    {group.features.map((feature) => (
                      <tr key={feature} className="border-t border-muted/30 hover:bg-muted/10">
                        <td className="p-3 text-foreground">{FEATURE_LABELS[feature]}</td>
                        {tierOrder.map((tier) => (
                          <td key={tier} className="text-center p-3">
                            {PLAN_CONFIGS[tier].features[feature] ? (
                              <Check size={16} className="text-green-500 mx-auto" />
                            ) : (
                              <X size={16} className="text-gray-300 mx-auto" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
