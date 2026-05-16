"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useOrgStore } from "@/store/org-store";
import { useAuthStore } from "@/store/auth-store";
import { PLAN_CONFIGS, getPlanConfig, FEATURE_LABELS, FEATURE_GROUPS, ADD_ONS, formatLimit } from "@/lib/plans";
import type { PlanTier } from "@/types";
import { Check, X, Crown, Sparkles, ArrowRight, Mail, Database, Infinity, Wrench, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tierOrder: PlanTier[] = ["free", "starter", "growth", "enterprise"];

export default function BillingPage() {
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const currentUser = useAuthStore((s) => s.currentUser);
  const searchParams = useSearchParams();
  const upgradedPlan = searchParams.get("upgraded");
  const currentPlan = (activeOrg?.plan ?? "free") as PlanTier;
  const currentConfig = getPlanConfig(currentPlan);
  const usage = activeOrg?.usage;

  const usageMetrics = [
    { label: "Team Members", current: usage?.currentUsers ?? 0, max: currentConfig.maxUsers },
    { label: "Respondents", current: usage?.currentRespondents ?? 0, max: currentConfig.maxRespondents },
    { label: "AI Conversations / month", current: usage?.aiConversationsThisMonth ?? 0, max: currentConfig.maxAIConversations },
    { label: "WA Initiative Conv. / month", current: usage?.waConversationsThisMonth ?? 0, max: currentConfig.maxWhatsAppInitiative },
  ];

  const [upgrading, setUpgrading] = useState<string | null>(null);

  const handleUpgrade = async (tier: PlanTier) => {
    if (tier === "enterprise") {
      window.open("mailto:hello@reachthesoul.org?subject=Enterprise Plan Inquiry&body=Hi, I would like to learn more about the Enterprise plan for our organization.", "_blank");
      return;
    }

    setUpgrading(tier);
    try {
      const res = await fetch("/api/lemon-squeezy/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: tier,
          orgId: activeOrg?.orgId ?? "",
          userEmail: currentUser?.email ?? "",
          userName: currentUser?.displayName ?? "",
        }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank");
      } else {
        alert("Failed to create checkout. Please try again or contact hello@reachthesoul.org");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Something went wrong. Please contact hello@reachthesoul.org");
    }
    setUpgrading(null);
  };

  const handleAddOn = (addOnId: string) => {
    const addOn = ADD_ONS.find(a => a.id === addOnId);
    window.open("mailto:hello@reachthesoul.org?subject=Add-on: " + encodeURIComponent(addOn?.name ?? "") + "&body=Hi, I would like to set up the " + encodeURIComponent(addOn?.name ?? "") + " add-on for our organization.", "_blank");
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div>
        <h2 className="text-base font-semibold text-foreground">Plan & Billing</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Manage your subscription and monitor usage.</p>
      </div>

      {/* Current plan */}
      <Card className="border-2 shadow-none" style={{ borderColor: currentConfig.color + "40" }}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: currentConfig.color + "15" }}>
                <Crown size={20} style={{ color: currentConfig.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">{currentConfig.name} Plan</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: currentConfig.color }}>CURRENT</span>
                </div>
                <p className="text-xs text-muted-foreground">{currentConfig.description}</p>
              </div>
            </div>
            <div className="text-right">
              {currentConfig.price > 0 ? (
                <>
                  <p className="text-2xl font-bold text-foreground">${currentConfig.price}</p>
                  <p className="text-[11px] text-muted-foreground">per month</p>
                </>
              ) : (
                <p className="text-2xl font-bold text-green-600">Free</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data notice */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
        <Database size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-blue-900">All your data is stored securely</p>
          <p className="text-[11px] text-blue-700 mt-0.5">
            Every conversation, respondent profile, ticket, and interaction is stored in our secure database.
            Access historical data, generate reports, and export anytime — nothing is ever deleted.
          </p>
        </div>
      </div>

      {/* Usage meters */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Current usage</h3>
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
                    <p className="text-xs text-muted-foreground">/ {max === 0 ? "N/A" : formatLimit(max)}</p>
                  </div>
                  {max > 0 ? (
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", isExceeded ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-green-500")} style={{ width: pct + "%" }} />
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic">Not available on this plan</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        {currentConfig.unlimitedWAInbound && (
          <div className="mt-2 flex items-center gap-2 text-[11px] text-green-700">
            <Infinity size={14} /> Unlimited incoming WhatsApp messages from respondents included.
          </div>
        )}
      </div>

      {/* Plan comparison */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Compare plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {tierOrder.map((tier) => {
            const config = PLAN_CONFIGS[tier];
            const isCurrent = tier === currentPlan;
            const isUpgrade = tierOrder.indexOf(tier) > tierOrder.indexOf(currentPlan);
            return (
              <Card key={tier} className={cn("shadow-none relative overflow-hidden flex flex-col", isCurrent && "border-2 ring-1 ring-offset-1")} style={isCurrent ? { borderColor: config.color } : {}}>
                {config.badge && (
                  <div className="absolute top-0 right-0 px-2.5 py-1 text-white text-[10px] font-bold rounded-bl-lg" style={{ backgroundColor: config.color }}>{config.badge}</div>
                )}
                <CardContent className="p-4 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.color }} />
                    <h4 className="text-sm font-bold text-foreground">{config.name}</h4>
                  </div>
                  <div className="mb-3">
                    {config.price > 0 ? (
                      <p className="text-xl font-bold text-foreground">${config.price}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                    ) : (
                      <p className="text-xl font-bold text-green-600">Free</p>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-4">{config.description}</p>
                  <div className="flex-1 space-y-1.5 mb-4">
                    {config.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-foreground">
                        <Check size={12} className="text-green-500 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto">
                    {isCurrent ? (
                      <Button variant="outline" size="sm" className="w-full" disabled>Current Plan</Button>
                    ) : isUpgrade ? (
                      <Button size="sm" className="w-full gap-1.5" onClick={() => handleUpgrade(tier)} disabled={upgrading === tier} style={{ backgroundColor: config.color }}>
                        {upgrading === tier ? "Processing..." : tier === "enterprise" ? <><Mail size={14} /> Contact Sales</> : <><Sparkles size={14} /> Upgrade to {config.name}</>}
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="w-full text-muted-foreground" disabled>&mdash;</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Add-ons */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Add-ons</h3>
        <p className="text-xs text-muted-foreground mb-3">Bring your own provider. Pay them directly for usage — we only charge a one-time setup fee.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ADD_ONS.map((addon) => (
            <Card key={addon.id} className="shadow-none">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                    <i className={cn("ti", addon.icon)} style={{ fontSize: "20px", color: "var(--color-text-secondary)" }} aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-foreground">{addon.name}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{addon.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-foreground">${addon.setupFee}</p>
                    <p className="text-[10px] text-muted-foreground">one-time setup</p>
                  </div>
                </div>
                <div className="space-y-1.5 mb-4">
                  {addon.details.map((d, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-foreground">
                      <Check size={12} className="text-green-500 shrink-0 mt-0.5" />
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => handleAddOn(addon.id)}>
                  <Wrench size={14} /> Request Setup
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Feature comparison table */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Detailed feature comparison</h3>
        <Card className="shadow-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left p-3 font-semibold text-foreground min-w-[220px]">Feature</th>
                  {tierOrder.map((tier) => (
                    <th key={tier} className="text-center p-3 font-semibold min-w-[100px]" style={{ color: PLAN_CONFIGS[tier].color }}>{PLAN_CONFIGS[tier].name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Limits */}
                <tr><td colSpan={5} className="px-3 py-2 bg-muted/20 font-semibold text-foreground text-[11px] uppercase tracking-wider">Limits & quotas</td></tr>
                <tr className="border-t border-muted/30"><td className="p-3 text-foreground">Max users</td>{tierOrder.map(t => <td key={t} className="text-center p-3 font-medium">{formatLimit(PLAN_CONFIGS[t].maxUsers)}</td>)}</tr>
                <tr className="border-t border-muted/30 bg-muted/5"><td className="p-3 text-foreground">Max respondents</td>{tierOrder.map(t => <td key={t} className="text-center p-3 font-medium">{formatLimit(PLAN_CONFIGS[t].maxRespondents)}</td>)}</tr>
                <tr className="border-t border-muted/30"><td className="p-3 text-foreground">AI conversations / month</td>{tierOrder.map(t => <td key={t} className="text-center p-3 font-medium">{PLAN_CONFIGS[t].maxAIConversations === 0 ? "\u2014" : formatLimit(PLAN_CONFIGS[t].maxAIConversations)}</td>)}</tr>
                <tr className="border-t border-muted/30 bg-muted/5"><td className="p-3 text-foreground">WA initiative conv. / month</td>{tierOrder.map(t => <td key={t} className="text-center p-3 font-medium">{PLAN_CONFIGS[t].maxWhatsAppInitiative === 0 ? "\u2014" : formatLimit(PLAN_CONFIGS[t].maxWhatsAppInitiative)}</td>)}</tr>
                <tr className="border-t border-muted/30"><td className="p-3 text-foreground">Incoming WA messages</td>{tierOrder.map(t => <td key={t} className="text-center p-3">{PLAN_CONFIGS[t].unlimitedWAInbound ? <span className="text-green-600 font-medium">Unlimited</span> : "\u2014"}</td>)}</tr>

                {/* Feature groups */}
                {FEATURE_GROUPS.map((group) => (
                  <>
                    <tr key={group.title}><td colSpan={5} className="px-3 py-2 bg-muted/20 font-semibold text-foreground text-[11px] uppercase tracking-wider">{group.title}</td></tr>
                    {group.features.map((feature, fi) => (
                      <tr key={feature} className={cn("border-t border-muted/30", fi % 2 === 1 && "bg-muted/5")}>
                        <td className="p-3 text-foreground">{FEATURE_LABELS[feature]}</td>
                        {tierOrder.map((tier) => (
                          <td key={tier} className="text-center p-3">
                            {PLAN_CONFIGS[tier].features[feature] ? <Check size={16} className="text-green-500 mx-auto" /> : <X size={16} className="text-gray-300 mx-auto" />}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}

                {/* Add-ons row */}
                <tr><td colSpan={5} className="px-3 py-2 bg-muted/20 font-semibold text-foreground text-[11px] uppercase tracking-wider">Add-ons (bring your own provider)</td></tr>
                <tr className="border-t border-muted/30">
                  <td className="p-3 text-foreground">AI \u2014 Bring Your Own Key</td>
                  {tierOrder.map(t => <td key={t} className="text-center p-3"><span className="text-[10px] text-blue-600 font-medium">$29 setup</span></td>)}
                </tr>
                <tr className="border-t border-muted/30 bg-muted/5">
                  <td className="p-3 text-foreground">Call / Telephony Integration</td>
                  <td className="text-center p-3"><X size={16} className="text-gray-300 mx-auto" /></td>
                  <td className="text-center p-3"><X size={16} className="text-gray-300 mx-auto" /></td>
                  <td className="text-center p-3"><span className="text-[10px] text-blue-600 font-medium">$49 setup</span></td>
                  <td className="text-center p-3"><span className="text-[10px] text-blue-600 font-medium">$49 setup</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Bottom CTA */}
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground mb-2">Need help choosing the right plan?</p>
        <a href="mailto:hello@reachthesoul.org" className="text-primary text-sm font-medium hover:underline">Contact us at hello@reachthesoul.org</a>
      </div>
    </div>
  );
}
