// ─── ORGANIZATION (TENANT) ─────────────────────────────────────────
export type PlanTier = "free" | "starter" | "growth" | "enterprise";

export interface Organization {
  orgId: string;
  name: string;
  slug: string;
  domain?: string;
  plan: PlanTier;
  logoUrl?: string;
  primaryColor?: string;
  limits: {
    maxUsers: number;
    maxRespondents: number;
    maxAIConversations: number;
    maxWhatsAppConversations: number;
    channels: string[];
  };
  usage: {
    currentUsers: number;
    currentRespondents: number;
    aiConversationsThisMonth: number;
    waConversationsThisMonth: number;
    usageResetDate: string;
  };
  channelConfig: {
    fonnte_token?: string;
    whatsapp_access_token?: string;
    whatsapp_phone_number_id?: string;
    active_whatsapp_provider?: "fonnte" | "meta";
    facebook_page_access_token?: string;
    instagram_access_token?: string;
    webhookSecret?: string;
  };
  aiConfig: {
    enabled: boolean;
    autoReply: boolean;
    provider: "openai" | "anthropic";
    apiKey?: string;
    model: string;
    systemPrompt: string;
    escalationTriggers: {
      reason: EscalationReason;
      label: string;
      keywords: string[];
      enabled: boolean;
    }[];
    channelToggles: Record<string, boolean>;
  };
  billingEmail: string;
  timezone: string;
  language: string;
  // Customizable per-org config
  progressSteps: string[];      // e.g. ["Data", "Doa", "Konseling", "Salvation"]
  programSources: string[];     // e.g. ["Website", "Instagram", "Event"]
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isActive: boolean;
}

export interface OrgMembership {
  orgId: string;
  orgName: string;
  role: UserRole;
  joinedAt: string;
}

// ─── CORE TYPES ────────────────────────────────────────────────────
export type UserRole = "agent" | "supervisor" | "admin";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high";
export type SenderRole = "agent" | "admin" | "system" | "ai";
export type HandledBy = "ai" | "human" | "escalated";

export type EscalationReason =
  | "prayer_request"
  | "counseling"
  | "salvation_inquiry"
  | "grief_or_crisis"
  | "baptism_request"
  | "manual_escalation";

export interface EscalationTrigger {
  reason: EscalationReason;
  label: string;
  detectedKeywords: string[];
  confidence: number; // 0-1
}

export interface AIConfig {
  enabled: boolean;
  autoReply: boolean;
  systemPrompt: string;
  escalationTriggers: {
    reason: EscalationReason;
    label: string;
    keywords: string[];
    enabled: boolean;
  }[];
  channelToggles: Record<string, boolean>;
}

export type OnlineStatus = "online" | "busy" | "away" | "offline";
export type ShiftName    = "Morning" | "Afternoon" | "Night" | "Off";

export interface UserPresence {
  uid:            string;
  status:         OnlineStatus;
  shift:          ShiftName;
  lastSeen:       string;        // ISO
  activeTickets:  number;
  note?:          string;        // e.g. "On lunch break"
}

export interface User {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  avatarInitials?: string;
  // Multi-tenant
  primaryOrgId: string;
  orgMemberships: OrgMembership[];
  orgRoles?: Record<string, UserRole>;
  isPlatformAdmin?: boolean;
}

// Progress steps — now configurable per org (stored in organizations/{orgId}.progressSteps)
// These are defaults for new organizations
export type RespondentProgress = string; // dynamic — defined per org

export const DEFAULT_PROGRESS_STEPS: string[] = [
  "Data", "Doa", "Konseling", "Rekomitmen", "Salvation", "POP",
];

export const DEFAULT_PROGRAM_SOURCES: string[] = [
  "Website", "WhatsApp", "Instagram", "Facebook", "YouTube", "Referral", "Event",
];

export interface Respondent {
  respondentId:      string;
  orgId:             string;  // tenant identifier
  fullName:          string;
  phone?:            string;
  email?:            string;
  leadSourceId:      string;
  leadSourceName?:   string;
  notes?:            string;
  isArchived:        boolean;
  createdAt:         string;
  ticketCount?:      number;
  // New fields
  age?:              number;
  city?:             string;
  problemCategories?: string[];   // free-text tags, editable by agent
  progress?:         RespondentProgress;
  firstContactDate?: string;      // ISO — derived from earliest ticket or set manually
  programSource?:    string;      // CBN program/ministry source (selectable + add-custom)
  isBlocked?:        boolean;
  blockedReason?:    string;
  blockedAt?:        string;      // ISO
  blockedBy?:        string;      // agent name
}

export type TicketDirection    = "inbound" | "outbound";
export type OutboundChannel    = "call" | "whatsapp" | "email" | "instagram_dm" | "facebook_dm" | "tiktok_dm";

export interface Ticket {
  ticketId: string;
  orgId: string;  // tenant identifier
  ticketNumber: string;
  respondentId: string;
  respondentName?: string;
  assignedAgentId: string | null;
  assignedAgentName?: string | null;
  status: TicketStatus;
  categoryId: string | null;
  categoryName?: string | null;
  interactionOutcomeId: string | null;
  outcomeName?: string | null;
  leadSourceId: string | null;
  subject: string;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  handledBy?: HandledBy;
  escalation?: EscalationTrigger | null;
  aiMessageCount?: number;
  // Outbound follow-up
  direction?:        TicketDirection;
  outboundChannel?:  OutboundChannel;
  outboundStatus?:   "pending" | "sent" | "no_answer" | "replied";
  scheduledAt?:      string;   // ISO — if scheduled for later
  followUpChannel?:  OutboundChannel;  // channel for scheduled follow-up
  followUpNote?:     string;           // brief note for the follow-up
  followUpCreatedBy?: string;          // uid of agent who scheduled it
}

export interface Message {
  messageId: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: SenderRole;
  content: string;
  isInternal: boolean;
  createdAt: string;
  aiGenerated?: boolean;
  escalationTriggered?: EscalationReason | null;
}

export interface Category {
  categoryId: string;
  orgId: string;  // tenant identifier
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface LeadSource {
  leadSourceId: string;
  orgId: string;  // tenant identifier
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProgramSource {
  programSourceId: string;
  orgId: string;  // tenant identifier
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface InteractionOutcome {
  outcomeId: string;
  orgId: string;  // tenant identifier
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export type NotificationType = "new_ticket" | "ticket_assigned" | "new_message" | "ticket_resolved" | "new_comment" | "system";

export interface AppNotification {
  notifId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  isRead: boolean;
  createdAt: string;
}

export type CallDirection = "inbound" | "outbound";
export type CallStatus    = "ringing" | "active" | "on_hold" | "completed" | "missed" | "failed";
export type CallProvider  = "twilio" | "voip" | "whatsapp" | "manual";

export interface CallRecord {
  callId:         string;
  orgId:          string;  // tenant identifier
  ticketId?:      string;           // linked ticket (may be created after)
  respondentId?:  string;           // resolved from phone number
  respondentName?: string;
  agentId:        string;
  agentName:      string;
  direction:      CallDirection;
  status:         CallStatus;
  provider:       CallProvider;
  fromNumber:     string;
  toNumber:       string;
  startedAt:      string;           // ISO
  answeredAt?:    string;
  endedAt?:       string;
  durationSeconds?: number;
  recordingUrl?:  string;
  notes?:         string;
  createdAt:      string;
}
