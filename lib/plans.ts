// lib/plans.ts
// ─── Plan Tier Configuration & Feature Gating ──────────────────────
// Central source of truth for all plan limits, features, and pricing.

import type { PlanTier } from "@/types";

export interface PlanConfig {
  name: string;
  tier: PlanTier;
  price: { idr: number; usd: number }; // per month
  description: string;
  color: string;
  
  // Limits
  maxUsers: number;
  maxRespondents: number;
  maxAIConversations: number;       // per month
  maxWhatsAppConversations: number; // per month, 0 = not available
  
  // Feature flags
  features: {
    websiteChat: boolean;
    whatsapp: boolean;
    instagram: boolean;
    facebook: boolean;
    youtube: boolean;
    aiAutoReply: boolean;
    aiCounseling24_7: boolean;
    advancedAIModel: boolean;       // Claude/GPT-4o vs GPT-4o-mini
    escalationTriggers: boolean;
    customProgressSteps: boolean;
    customProgramSources: boolean;
    reporting: boolean;
    advancedReporting: boolean;
    exportCSV: boolean;
    callFeature: boolean;
    schedule: boolean;
    socialInbox: boolean;
    teamManagement: boolean;
    customBranding: boolean;        // custom logo, colors
    apiAccess: boolean;
    prioritySupport: boolean;
    dedicatedSupport: boolean;
    sla: boolean;
  };
  
  // Allowed channels list (for org creation)
  channels: string[];
}

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  free: {
    name: "Free",
    tier: "free",
    price: { idr: 0, usd: 0 },
    description: "Get started with basic outreach tools",
    color: "#6B7280", // gray
    maxUsers: 1,
    maxRespondents: 50,
    maxAIConversations: 0,
    maxWhatsAppConversations: 0,
    features: {
      websiteChat: true,
      whatsapp: false,
      instagram: false,
      facebook: false,
      youtube: false,
      aiAutoReply: false,
      aiCounseling24_7: false,
      advancedAIModel: false,
      escalationTriggers: false,
      customProgressSteps: false,
      customProgramSources: false,
      reporting: true,
      advancedReporting: false,
      exportCSV: false,
      callFeature: false,
      schedule: true,
      socialInbox: false,
      teamManagement: false,
      customBranding: false,
      apiAccess: false,
      prioritySupport: false,
      dedicatedSupport: false,
      sla: false,
    },
    channels: ["website"],
  },
  
  starter: {
    name: "Starter",
    tier: "starter",
    price: { idr: 799000, usd: 49 },
    description: "For churches getting serious about digital outreach",
    color: "#2563EB", // blue
    maxUsers: 3,
    maxRespondents: 500,
    maxAIConversations: 300,
    maxWhatsAppConversations: 300,
    features: {
      websiteChat: true,
      whatsapp: true,
      instagram: true,
      facebook: true,
      youtube: false,
      aiAutoReply: true,
      aiCounseling24_7: false,
      advancedAIModel: false,
      escalationTriggers: true,
      customProgressSteps: true,
      customProgramSources: true,
      reporting: true,
      advancedReporting: false,
      exportCSV: true,
      callFeature: false,
      schedule: true,
      socialInbox: true,
      teamManagement: true,
      customBranding: false,
      apiAccess: false,
      prioritySupport: false,
      dedicatedSupport: false,
      sla: false,
    },
    channels: ["website", "whatsapp_fonnte", "whatsapp_meta", "instagram", "facebook"],
  },
  
  growth: {
    name: "Growth",
    tier: "growth",
    price: { idr: 2499000, usd: 149 },
    description: "For growing ministries that need full power",
    color: "#7C3AED", // purple
    maxUsers: 15,
    maxRespondents: 2000,
    maxAIConversations: 1500,
    maxWhatsAppConversations: 1000,
    features: {
      websiteChat: true,
      whatsapp: true,
      instagram: true,
      facebook: true,
      youtube: true,
      aiAutoReply: true,
      aiCounseling24_7: true,
      advancedAIModel: true,
      escalationTriggers: true,
      customProgressSteps: true,
      customProgramSources: true,
      reporting: true,
      advancedReporting: true,
      exportCSV: true,
      callFeature: true,
      schedule: true,
      socialInbox: true,
      teamManagement: true,
      customBranding: true,
      apiAccess: false,
      prioritySupport: true,
      dedicatedSupport: false,
      sla: false,
    },
    channels: ["website", "whatsapp_fonnte", "whatsapp_meta", "instagram", "facebook", "youtube"],
  },
  
  enterprise: {
    name: "Enterprise",
    tier: "enterprise",
    price: { idr: 0, usd: 0 }, // custom pricing
    description: "For denominations and large organizations",
    color: "#D97706", // amber
    maxUsers: 999,
    maxRespondents: 99999,
    maxAIConversations: 99999,
    maxWhatsAppConversations: 99999,
    features: {
      websiteChat: true,
      whatsapp: true,
      instagram: true,
      facebook: true,
      youtube: true,
      aiAutoReply: true,
      aiCounseling24_7: true,
      advancedAIModel: true,
      escalationTriggers: true,
      customProgressSteps: true,
      customProgramSources: true,
      reporting: true,
      advancedReporting: true,
      exportCSV: true,
      callFeature: true,
      schedule: true,
      socialInbox: true,
      teamManagement: true,
      customBranding: true,
      apiAccess: true,
      prioritySupport: true,
      dedicatedSupport: true,
      sla: true,
    },
    channels: ["website", "whatsapp_fonnte", "whatsapp_meta", "instagram", "facebook", "youtube"],
  },
};

// ─── Feature gating helpers ─────────────────────────────────────────

export type FeatureKey = keyof PlanConfig["features"];

export function getPlanConfig(tier: PlanTier): PlanConfig {
  return PLAN_CONFIGS[tier] ?? PLAN_CONFIGS.free;
}

export function isFeatureAvailable(tier: PlanTier, feature: FeatureKey): boolean {
  return getPlanConfig(tier).features[feature] ?? false;
}

export function getMinimumPlanForFeature(feature: FeatureKey): PlanTier {
  const tiers: PlanTier[] = ["free", "starter", "growth", "enterprise"];
  for (const tier of tiers) {
    if (PLAN_CONFIGS[tier].features[feature]) return tier;
  }
  return "enterprise";
}

export function isWithinLimit(
  tier: PlanTier,
  metric: "users" | "respondents" | "aiConversations" | "waConversations",
  currentCount: number
): boolean {
  const config = getPlanConfig(tier);
  switch (metric) {
    case "users":           return currentCount < config.maxUsers;
    case "respondents":     return currentCount < config.maxRespondents;
    case "aiConversations": return currentCount < config.maxAIConversations;
    case "waConversations": return currentCount < config.maxWhatsAppConversations;
    default:                return true;
  }
}

export function getUsagePercentage(
  tier: PlanTier,
  metric: "users" | "respondents" | "aiConversations" | "waConversations",
  currentCount: number
): number {
  const config = getPlanConfig(tier);
  let max: number;
  switch (metric) {
    case "users":           max = config.maxUsers; break;
    case "respondents":     max = config.maxRespondents; break;
    case "aiConversations": max = config.maxAIConversations; break;
    case "waConversations": max = config.maxWhatsAppConversations; break;
    default:                max = 1;
  }
  if (max === 0) return 0;
  return Math.min(100, Math.round((currentCount / max) * 100));
}

// Feature display names for UI
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  websiteChat:           "Website Chat Widget",
  whatsapp:              "WhatsApp Integration",
  instagram:             "Instagram DM",
  facebook:              "Facebook Messenger",
  youtube:               "YouTube Comments",
  aiAutoReply:           "AI Auto-Reply",
  aiCounseling24_7:      "24/7 AI Counselor",
  advancedAIModel:       "Advanced AI Model (GPT-4o / Claude)",
  escalationTriggers:    "Escalation Triggers",
  customProgressSteps:   "Custom Progress Steps",
  customProgramSources:  "Custom Program Sources",
  reporting:             "Basic Reports",
  advancedReporting:     "Advanced Analytics",
  exportCSV:             "Export to CSV",
  callFeature:           "Call / Telephony",
  schedule:              "Schedule & Calendar",
  socialInbox:           "Social Inbox",
  teamManagement:        "Team Management",
  customBranding:        "Custom Branding",
  apiAccess:             "API Access",
  prioritySupport:       "Priority Support",
  dedicatedSupport:      "Dedicated Account Manager",
  sla:                   "SLA Guarantee",
};

// Grace period: 7 days after limit exceeded before hard block
export const GRACE_PERIOD_DAYS = 7;
