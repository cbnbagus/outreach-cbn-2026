// Social Account — represents one connected social media account / channel inbox.
// CBN has multiple accounts per platform, one per program (Solusi, Superyouth, etc.)

export type SocialPlatform =
  | "whatsapp_fonnte"
  | "whatsapp_meta"
  | "facebook"
  | "instagram"
  | "email"
  | "call";

// ── Per-platform credentials ────────────────────────────────────────────────

export interface FonnteCredentials {
  token: string;
  deviceLabel?: string;
}

export interface WhatsappMetaCredentials {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  verifyToken: string;
}

export interface FacebookCredentials {
  pageId: string;
  pageName?: string;
  pageAccessToken: string;
  appSecret?: string;
}

export interface InstagramCredentials {
  igUserId: string;
  igUsername?: string;
  pageAccessToken: string;
  linkedFacebookPageId?: string;
}

export interface EmailCredentials {
  address: string;
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
  username?: string;
}

export interface CallCredentials {
  provider?: string;
  inboundNumber?: string;
}

export type SocialAccountCredentials =
  | FonnteCredentials
  | WhatsappMetaCredentials
  | FacebookCredentials
  | InstagramCredentials
  | EmailCredentials
  | CallCredentials;

// ── AI override (per account, optional) ────────────────────────────────────
export interface SocialAccountAISettings {
  enabled?: boolean;
  autoReply?: boolean;
  systemPromptOverride?: string;
}

// ── Main document shape ────────────────────────────────────────────────────
export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  programName: string;          // "Solusi", "Superyouth", "Cahaya Bagi Negeri", ...
  displayName: string;          // free-form label shown in UI
  credentials: SocialAccountCredentials;
  aiSettings?: SocialAccountAISettings;
  isActive: boolean;
  webhookPath?: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

// ── Type guards ────────────────────────────────────────────────────────────
export function isFonnte(c: SocialAccountCredentials): c is FonnteCredentials {
  return (c as FonnteCredentials).token !== undefined;
}
export function isFacebook(c: SocialAccountCredentials): c is FacebookCredentials {
  return (c as FacebookCredentials).pageId !== undefined &&
         (c as FacebookCredentials).pageAccessToken !== undefined;
}
export function isInstagram(c: SocialAccountCredentials): c is InstagramCredentials {
  return (c as InstagramCredentials).igUserId !== undefined;
}
export function isWhatsappMeta(c: SocialAccountCredentials): c is WhatsappMetaCredentials {
  return (c as WhatsappMetaCredentials).phoneNumberId !== undefined;
}
