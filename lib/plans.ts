// lib/plans.ts
// ─── Plan Tier Configuration & Feature Gating ──────────────────────
// Central source of truth for all plan limits, features, pricing, and add-ons.

import type { PlanTier } from "@/types";

export interface PlanConfig {
  name: string;
  tier: PlanTier;
  price: number; // USD per month
  description: string;
  color: string;
  badge?: string;
  
  maxUsers: number;
  maxRespondents: number;
  maxAIConversations: number;       // included with platform AI key
  maxWhatsAppInitiative: number;
  unlimitedWAInbound: boolean;
  
  features: {
    websiteChat: boolean;
    whatsapp: boolean;
    instagram: boolean;
    facebook: boolean;
    tiktok: boolean;
    youtube: boolean;
    omnichannel: boolean;
    aiAutoReply: boolean;
    aiCounseling24_7: boolean;
    advancedAIModel: boolean;
    aiHandoffToHuman: boolean;
    escalationTriggers: boolean;
    customProgressSteps: boolean;
    customProgramSources: boolean;
    reporting: boolean;
    advancedReporting: boolean;
    exportCSV: boolean;
    dataRetention: boolean;
    schedule: boolean;
    socialInbox: boolean;
    teamManagement: boolean;
    inviteLinks: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    webhookAccess: boolean;
    prioritySupport: boolean;
    dedicatedSupport: boolean;
    sla: boolean;
    onboarding: boolean;
  };
  
  channels: string[];
  highlights: string[];
}

// ─── Add-on definitions ─────────────────────────────────────────────

export interface AddOn {
  id: string;
  name: string;
  description: string;
  setupFee: number;        // USD one-time
  monthlyFee: number;      // USD recurring (0 = no recurring)
  icon: string;            // Tabler icon name
  details: string[];
}

export const ADD_ONS: AddOn[] = [
  {
    id: "ai-byok",
    name: "AI — Bring Your Own Key",
    description: "Connect your own AI provider API key (OpenAI, Anthropic, Google, Mistral, etc). Unlimited AI conversations — you pay the provider directly.",
    setupFee: 29,
    monthlyFee: 0,
    icon: "ti-brain",
    details: [
      "Unlimited AI conversations (no platform quota)",
      "Choose any supported provider & model",
      "You pay the AI provider directly for usage",
      "We help configure prompts, escalation triggers & testing",
      "Available on any plan (Free, Starter, Growth, Enterprise)",
    ],
  },
  {
    id: "call-integration",
    name: "Call / Telephony Integration",
    description: "Connect your own telephony provider (Twilio, Vonage, SIP/PBX, or any compatible provider). Full softphone, call recording & call log included.",
    setupFee: 49,
    monthlyFee: 0,
    icon: "ti-phone-call",
    details: [
      "Browser-based softphone (inbound & outbound)",
      "Call recording with automatic log",
      "Bring your own provider — Twilio, Vonage, SIP/PBX, etc.",
      "You pay the telephony provider directly for call minutes",
      "We help configure webhooks, routing & testing",
      "Available on Growth and Enterprise plans",
    ],
  },
];

// ─── Plan configurations ────────────────────────────────────────────

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  free: {
    name: "Free",
    tier: "free",
    price: 0,
    description: "Get started with basic outreach tools. No credit card required.",
    color: "#6B7280",
    maxUsers: 1,
    maxRespondents: 50,
    maxAIConversations: 0,
    maxWhatsAppInitiative: 0,
    unlimitedWAInbound: false,
    features: {
      websiteChat: true,
      whatsapp: false,
      instagram: false,
      facebook: false,
      tiktok: false,
      youtube: false,
      omnichannel: false,
      aiAutoReply: false,
      aiCounseling24_7: false,
      advancedAIModel: false,
      aiHandoffToHuman: false,
      escalationTriggers: false,
      customProgressSteps: false,
      customProgramSources: false,
      reporting: true,
      advancedReporting: false,
      exportCSV: false,
      dataRetention: true,
      schedule: true,
      socialInbox: false,
      teamManagement: false,
      inviteLinks: false,
      customBranding: false,
      apiAccess: false,
      webhookAccess: false,
      prioritySupport: false,
      dedicatedSupport: false,
      sla: false,
      onboarding: false,
    },
    channels: ["website"],
    highlights: [
      "1 user",
      "50 respondents",
      "Website chat only",
      "Basic reporting",
      "All data stored securely",
    ],
  },
  
  starter: {
    name: "Starter",
    tier: "starter",
    price: 29,
    description: "WhatsApp + AI auto-reply. The sweet spot for most churches.",
    color: "#2563EB",
    maxUsers: 3,
    maxRespondents: 500,
    maxAIConversations: 300,
    maxWhatsAppInitiative: 500,
    unlimitedWAInbound: true,
    features: {
      websiteChat: true,
      whatsapp: true,
      instagram: false,
      facebook: false,
      tiktok: false,
      youtube: false,
      omnichannel: false,
      aiAutoReply: true,
      aiCounseling24_7: false,
      advancedAIModel: false,
      aiHandoffToHuman: true,
      escalationTriggers: true,
      customProgressSteps: true,
      customProgramSources: true,
      reporting: true,
      advancedReporting: false,
      exportCSV: true,
      dataRetention: true,
      schedule: true,
      socialInbox: false,
      teamManagement: true,
      inviteLinks: true,
      customBranding: false,
      apiAccess: false,
      webhookAccess: false,
      prioritySupport: false,
      dedicatedSupport: false,
      sla: false,
      onboarding: false,
    },
    channels: ["website", "whatsapp_fonnte", "whatsapp_meta"],
    highlights: [
      "3 users",
      "500 respondents",
      "300 AI conversations/mo \u2014 then human handoff",
      "500 WA initiative conversations/mo",
      "\u221e Unlimited incoming WA messages",
      "WhatsApp Business API",
      "AI auto-reply (basic model)",
      "Team management & invite links",
      "Export CSV + reports",
      "All data stored \u2014 reports anytime",
    ],
  },
  
  growth: {
    name: "Growth",
    tier: "growth",
    price: 79,
    description: "Full omnichannel + advanced AI. For serious, growing ministries.",
    color: "#7C3AED",
    badge: "MOST POPULAR",
    maxUsers: 15,
    maxRespondents: 2000,
    maxAIConversations: 1500,
    maxWhatsAppInitiative: 1000,
    unlimitedWAInbound: true,
    features: {
      websiteChat: true,
      whatsapp: true,
      instagram: true,
      facebook: true,
      tiktok: true,
      youtube: true,
      omnichannel: true,
      aiAutoReply: true,
      aiCounseling24_7: true,
      advancedAIModel: true,
      aiHandoffToHuman: true,
      escalationTriggers: true,
      customProgressSteps: true,
      customProgramSources: true,
      reporting: true,
      advancedReporting: true,
      exportCSV: true,
      dataRetention: true,
      schedule: true,
      socialInbox: true,
      teamManagement: true,
      inviteLinks: true,
      customBranding: true,
      apiAccess: false,
      webhookAccess: true,
      prioritySupport: true,
      dedicatedSupport: false,
      sla: false,
      onboarding: false,
    },
    channels: ["website", "whatsapp_fonnte", "whatsapp_meta", "instagram", "facebook", "youtube"],
    highlights: [
      "15 users",
      "2,000 respondents",
      "1,500 AI conversations/mo \u2014 then human handoff",
      "1,000 WA initiative conversations/mo",
      "\u221e Unlimited incoming WA messages",
      "Omnichannel: Instagram DM, Facebook DM, TikTok DM",
      "24/7 AI counselor (advanced model)",
      "Advanced analytics & reporting",
      "Custom branding (logo & colors)",
      "Priority support",
      "All data stored \u2014 full history & reports anytime",
    ],
  },
  
  enterprise: {
    name: "Enterprise",
    tier: "enterprise",
    price: 249,
    description: "For denominations, large churches & ministry networks. Near-unlimited everything.",
    color: "#D97706",
    maxUsers: 999,
    maxRespondents: 99999,
    maxAIConversations: 5000,
    maxWhatsAppInitiative: 3000,
    unlimitedWAInbound: true,
    features: {
      websiteChat: true,
      whatsapp: true,
      instagram: true,
      facebook: true,
      tiktok: true,
      youtube: true,
      omnichannel: true,
      aiAutoReply: true,
      aiCounseling24_7: true,
      advancedAIModel: true,
      aiHandoffToHuman: true,
      escalationTriggers: true,
      customProgressSteps: true,
      customProgramSources: true,
      reporting: true,
      advancedReporting: true,
      exportCSV: true,
      dataRetention: true,
      schedule: true,
      socialInbox: true,
      teamManagement: true,
      inviteLinks: true,
      customBranding: true,
      apiAccess: true,
      webhookAccess: true,
      prioritySupport: true,
      dedicatedSupport: true,
      sla: true,
      onboarding: true,
    },
    channels: ["website", "whatsapp_fonnte", "whatsapp_meta", "instagram", "facebook", "youtube"],
    highlights: [
      "Unlimited users",
      "Unlimited respondents",
      "5,000 AI conversations/mo (advanced model)",
      "3,000 WA initiative conversations/mo",
      "\u221e Unlimited incoming WA messages",
      "All omnichannel + YouTube",
      "API & webhook access",
      "Dedicated account manager",
      "SLA guarantee & priority onboarding",
      "All data stored indefinitely \u2014 complete audit trail",
    ],
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
  metric: "users" | "respondents" | "aiConversations" | "waInitiative",
  currentCount: number
): boolean {
  const config = getPlanConfig(tier);
  switch (metric) {
    case "users":           return currentCount < config.maxUsers;
    case "respondents":     return currentCount < config.maxRespondents;
    case "aiConversations": return currentCount < config.maxAIConversations;
    case "waInitiative":    return currentCount < config.maxWhatsAppInitiative;
    default:                return true;
  }
}

export function getUsagePercentage(
  tier: PlanTier,
  metric: "users" | "respondents" | "aiConversations" | "waInitiative",
  currentCount: number
): number {
  const config = getPlanConfig(tier);
  let max: number;
  switch (metric) {
    case "users":           max = config.maxUsers; break;
    case "respondents":     max = config.maxRespondents; break;
    case "aiConversations": max = config.maxAIConversations; break;
    case "waInitiative":    max = config.maxWhatsAppInitiative; break;
    default:                max = 1;
  }
  if (max === 0) return 0;
  return Math.min(100, Math.round((currentCount / max) * 100));
}

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  websiteChat:           "Website Chat Widget",
  whatsapp:              "WhatsApp Business API",
  instagram:             "Instagram DM",
  facebook:              "Facebook Messenger",
  tiktok:                "TikTok DM",
  youtube:               "YouTube Comments",
  omnichannel:           "Omnichannel Conversations",
  aiAutoReply:           "AI Auto-Reply",
  aiCounseling24_7:      "24/7 AI Counselor",
  advancedAIModel:       "Advanced AI Model",
  aiHandoffToHuman:      "AI \u2192 Human Handoff",
  escalationTriggers:    "Escalation Triggers",
  customProgressSteps:   "Custom Progress Steps",
  customProgramSources:  "Custom Program Sources",
  reporting:             "Basic Reporting & Dashboard",
  advancedReporting:     "Advanced Analytics & Insights",
  exportCSV:             "Export Data to CSV",
  dataRetention:         "All Data Stored & Retrievable",
  schedule:              "Schedule & Calendar",
  socialInbox:           "Social Inbox (Comments & DMs)",
  teamManagement:        "Team Management",
  inviteLinks:           "Invite Links for Team",
  customBranding:        "Custom Branding (Logo & Colors)",
  apiAccess:             "API Access",
  webhookAccess:         "Webhook Access",
  prioritySupport:       "Priority Support",
  dedicatedSupport:      "Dedicated Account Manager",
  sla:                   "SLA Guarantee",
  onboarding:            "Priority Onboarding Session",
};

export const FEATURE_GROUPS: { title: string; features: FeatureKey[] }[] = [
  { title: "Channels & Messaging", features: ["websiteChat", "whatsapp", "omnichannel", "instagram", "facebook", "tiktok", "youtube"] },
  { title: "AI & Automation", features: ["aiAutoReply", "aiHandoffToHuman", "aiCounseling24_7", "advancedAIModel", "escalationTriggers"] },
  { title: "Team & Management", features: ["teamManagement", "inviteLinks", "customProgressSteps", "customProgramSources", "socialInbox", "schedule"] },
  { title: "Data, Reports & Export", features: ["dataRetention", "reporting", "advancedReporting", "exportCSV"] },
  { title: "Customization & Integration", features: ["customBranding", "apiAccess", "webhookAccess"] },
  { title: "Support & SLA", features: ["prioritySupport", "dedicatedSupport", "sla", "onboarding"] },
];

export const GRACE_PERIOD_DAYS = 7;

export function formatLimit(n: number): string {
  if (n >= 99999) return "Unlimited";
  return n.toLocaleString();
}
