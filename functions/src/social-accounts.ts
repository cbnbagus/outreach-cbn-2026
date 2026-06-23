import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { Firestore } from "firebase-admin/firestore";

// Lazy init — never call initializeApp at module top level
function getApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!;
  return admin.initializeApp();
}
function getDb(): Firestore {
  return getApp().firestore();
}

export type SocialPlatform =
  | "whatsapp_fonnte"
  | "whatsapp_meta"
  | "facebook"
  | "instagram"
  | "email"
  | "call";

export interface SocialAccountDoc {
  id: string;
  platform: SocialPlatform;
  programName: string;
  displayName: string;
  credentials: Record<string, any>;
  aiSettings?: {
    enabled?: boolean;
    autoReply?: boolean;
    systemPromptOverride?: string;
  };
  isActive: boolean;
}

// ── In-memory cache (60s TTL) ───────────────────────────────────────────────
type CacheEntry = { data: SocialAccountDoc | null; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

function getCached(key: string): SocialAccountDoc | null | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return undefined; }
  return entry.data;
}

function setCached(key: string, data: SocialAccountDoc | null) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearSocialAccountCache() { cache.clear(); }

// ── Lookup by document ID ───────────────────────────────────────────────────
export async function getSocialAccountById(id: string): Promise<SocialAccountDoc | null> {
  const cacheKey = `id:${id}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;
  try {
    const snap = await getDb().collection("social_accounts").doc(id).get();
    if (!snap.exists) { setCached(cacheKey, null); return null; }
    const data = { id: snap.id, ...snap.data() } as SocialAccountDoc;
    setCached(cacheKey, data);
    return data;
  } catch (err) { logger.error("[getSocialAccountById]", err); return null; }
}

// ── Facebook: lookup by Page ID ─────────────────────────────────────────────
export async function getSocialAccountByFacebookPageId(
  pageId: string
): Promise<SocialAccountDoc | null> {
  const cacheKey = `fb:${pageId}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;
  try {
    const snap = await getDb().collection("social_accounts")
      .where("platform", "==", "facebook")
      .where("credentials.pageId", "==", pageId)
      .where("isActive", "==", true)
      .limit(1).get();
    if (snap.empty) { setCached(cacheKey, null); return null; }
    const doc = snap.docs[0];
    const data = { id: doc.id, ...doc.data() } as SocialAccountDoc;
    setCached(cacheKey, data);
    return data;
  } catch (err) { logger.error("[getSocialAccountByFacebookPageId]", err); return null; }
}

// ── Instagram: lookup by IG User ID ─────────────────────────────────────────
export async function getSocialAccountByInstagramUserId(
  igUserId: string
): Promise<SocialAccountDoc | null> {
  const cacheKey = `ig:${igUserId}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;
  try {
    const snap = await getDb().collection("social_accounts")
      .where("platform", "==", "instagram")
      .where("credentials.igUserId", "==", igUserId)
      .where("isActive", "==", true)
      .limit(1).get();
    if (snap.empty) { setCached(cacheKey, null); return null; }
    const doc = snap.docs[0];
    const data = { id: doc.id, ...doc.data() } as SocialAccountDoc;
    setCached(cacheKey, data);
    return data;
  } catch (err) { logger.error("[getSocialAccountByInstagramUserId]", err); return null; }
}

// ── WhatsApp Meta: lookup by phone_number_id ────────────────────────────────
export async function getSocialAccountByWhatsappPhoneId(
  phoneNumberId: string
): Promise<SocialAccountDoc | null> {
  const cacheKey = `wameta:${phoneNumberId}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;
  try {
    const snap = await getDb().collection("social_accounts")
      .where("platform", "==", "whatsapp_meta")
      .where("credentials.phoneNumberId", "==", phoneNumberId)
      .where("isActive", "==", true)
      .limit(1).get();
    if (snap.empty) { setCached(cacheKey, null); return null; }
    const doc = snap.docs[0];
    const data = { id: doc.id, ...doc.data() } as SocialAccountDoc;
    setCached(cacheKey, data);
    return data;
  } catch (err) { logger.error("[getSocialAccountByWhatsappPhoneId]", err); return null; }
}

// ── Fonnte: lookup by API token ─────────────────────────────────────────────
export async function getSocialAccountByFonnteToken(
  token: string
): Promise<SocialAccountDoc | null> {
  const cacheKey = `fonnte:${token}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;
  try {
    const snap = await getDb().collection("social_accounts")
      .where("platform", "==", "whatsapp_fonnte")
      .where("credentials.token", "==", token)
      .where("isActive", "==", true)
      .limit(1).get();
    if (snap.empty) { setCached(cacheKey, null); return null; }
    const doc = snap.docs[0];
    const data = { id: doc.id, ...doc.data() } as SocialAccountDoc;
    setCached(cacheKey, data);
    return data;
  } catch (err) { logger.error("[getSocialAccountByFonnteToken]", err); return null; }
}

// ── Fonnte: lookup by device phone number (from webhook payload) ────────────
export async function getSocialAccountByFonnteDevice(
  deviceNumber: string
): Promise<SocialAccountDoc | null> {
  // Normalize — strip non-digits
  const normalized = deviceNumber.replace(/\D/g, "");
  if (!normalized) return null;

  const cacheKey = `fonnte-device:${normalized}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;
  try {
    const snap = await getDb().collection("social_accounts")
      .where("platform", "==", "whatsapp_fonnte")
      .where("credentials.deviceNumber", "==", normalized)
      .where("isActive", "==", true)
      .limit(1).get();
    if (snap.empty) { setCached(cacheKey, null); return null; }
    const doc = snap.docs[0];
    const data = { id: doc.id, ...doc.data() } as SocialAccountDoc;
    setCached(cacheKey, data);
    return data;
  } catch (err) { logger.error("[getSocialAccountByFonnteDevice]", err); return null; }
}

// ── Generic: first active account of a platform (migration fallback) ────────
export async function getFirstActiveAccountByPlatform(
  platform: SocialPlatform
): Promise<SocialAccountDoc | null> {
  const cacheKey = `first:${platform}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;
  try {
    const snap = await getDb().collection("social_accounts")
      .where("platform", "==", platform)
      .where("isActive", "==", true)
      .limit(1).get();
    if (snap.empty) { setCached(cacheKey, null); return null; }
    const doc = snap.docs[0];
    const data = { id: doc.id, ...doc.data() } as SocialAccountDoc;
    setCached(cacheKey, data);
    return data;
  } catch (err) { logger.error("[getFirstActiveAccountByPlatform]", err); return null; }
}