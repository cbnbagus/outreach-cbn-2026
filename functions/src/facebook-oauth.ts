// ────────────────────────────────────────────────────────────────────────────
// Facebook / Instagram OAuth "Connect" flow
//
// Two HTTP endpoints (Cloud Functions, region asia-southeast1):
//
//   fbConnectStart     GET  → validates plan, redirects to Facebook OAuth dialog
//   fbConnectCallback  GET  → receives ?code, exchanges tokens, saves social_accounts,
//                             auto-subscribes each page (and linked IG account) to the
//                             webhook, then redirects back to the OMS Social Accounts page.
//
// Token exchange chain (per Meta docs):
//   auth code → short-lived user token → long-lived user token
//   → GET /me/accounts (page list + PERMANENT page tokens)
//   → for each page: read linked IG business account, subscribe page + IG to webhooks
//
// Reusable pattern: even though RTS runs through SocialAPI.ai for now, this
// direct-Graph OAuth flow is the durable mid/long-term integration and stays here.
//
// Shares META_APP_SECRET with verify-signature.ts (one Meta App → one App Secret).
// ────────────────────────────────────────────────────────────────────────────

import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { Firestore, FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";
import { clearSocialAccountCache } from "./social-accounts";

// ── Config ──────────────────────────────────────────────────────────────────
const GRAPH_VERSION = "v21.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const IG_GRAPH_VERSION = "v25.0"; // matches subscribe-ig-webhook.js
const FB_OAUTH_DIALOG = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

const META_APP_ID = "1565702391720603"; // CBN Outreach

// Permissions we request. pages_show_list + pages_manage_metadata are required to
// list pages and subscribe them to the webhook; messaging scopes let us receive &
// send DMs; the instagram_* scopes cover IG Messaging via the linked page.
const SCOPES = [
  "pages_show_list",
  "pages_manage_metadata",
  "pages_messaging",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_manage_messages",
  "business_management",
].join(",");

// Fields subscribed on each Facebook Page (Messenger).
const FB_SUBSCRIBED_FIELDS = [
  "messages",
  "messaging_postbacks",
  "message_deliveries",
  "message_reads",
  "messaging_referrals",
].join(",");

// Fields subscribed on each Instagram account — mirrors subscribe-ig-webhook.js.
const IG_SUBSCRIBED_FIELDS = [
  "messages",
  "messaging_postbacks",
  "messaging_seen",
  "message_reactions",
].join(",");

// ── Lazy admin init (never initializeApp at module top level) ────────────────
function getApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!;
  return admin.initializeApp();
}
function getDb(): Firestore {
  return getApp().firestore();
}

// App secret — same env var used by verify-signature.ts.
// Set with: firebase functions:secrets:set META_APP_SECRET
function getAppSecret(): string {
  return process.env.META_APP_SECRET ?? "";
}

// Where to bounce the admin back to after connecting. Overridable per-env.
function getOmsReturnUrl(): string {
  return (
    (process.env.OMS_BASE_URL ?? "https://outreach-cbn-2026.web.app").replace(/\/$/, "") +
    "/dashboard/admin/social-accounts"
  );
}

// This function's own public base URL (for building the OAuth redirect_uri).
// Must EXACTLY match a Valid OAuth Redirect URI configured in the Meta app.
function getCallbackUrl(): string {
  const region = "asia-southeast1";
  const projectId =
    process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT ?? "outreach-cbn-2026";
  return `https://${region}-${projectId}.cloudfunctions.net/fbConnectCallback`;
}

// ── Plan gate ───────────────────────────────────────────────────────────────
// Paid plans that may self-connect social channels.
const PAID_PLANS = new Set(["starter", "growth", "enterprise"]);

async function getOrgPlan(orgId: string): Promise<string> {
  try {
    const snap = await getDb().collection("organizations").doc(orgId).get();
    if (!snap.exists) return "free";
    return (snap.data()?.plan as string) ?? "free";
  } catch (err) {
    logger.error("[fbConnect] getOrgPlan failed", err);
    return "free";
  }
}

// ── CSRF state: signed, short-lived, carries orgId ──────────────────────────
// state = base64url(json).hmacSHA256(appSecret) — verified on callback.
function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function b64urlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function signState(payload: Record<string, any>): string {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto
    .createHmac("sha256", getAppSecret() || "dev-secret")
    .update(body)
    .digest("hex");
  return `${body}.${sig}`;
}

function verifyState(state: string): Record<string, any> | null {
  if (!state || !state.includes(".")) return null;
  const [body, sig] = state.split(".");
  const expected = crypto
    .createHmac("sha256", getAppSecret() || "dev-secret")
    .update(body)
    .digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body).toString("utf8"));
    if (typeof payload.ts === "number" && Date.now() - payload.ts > 10 * 60_000) {
      return null; // expired (>10 min)
    }
    return payload;
  } catch {
    return null;
  }
}

// ── Graph helpers ───────────────────────────────────────────────────────────
async function graphGet(path: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${GRAPH}/${path}?${qs}`);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message ?? `Graph GET ${path} failed (${res.status})`);
  }
  return data;
}

async function graphPost(path: string, params: Record<string, string>): Promise<any> {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message ?? `Graph POST ${path} failed (${res.status})`);
  }
  return data;
}

// Subscribe a Facebook Page to the Messenger webhook.
async function subscribeFacebookPage(pageId: string, pageToken: string): Promise<void> {
  await graphPost(`${pageId}/subscribed_apps`, {
    subscribed_fields: FB_SUBSCRIBED_FIELDS,
    access_token: pageToken,
  });
}

// Subscribe an Instagram account to the IG webhook using the linked Page token.
// Mirrors subscribe-ig-webhook.js field set. For Page-linked IG business accounts
// the Page token + {ig-id}/subscribed_apps on the Graph API is the correct call.
async function subscribeInstagram(igUserId: string, pageToken: string): Promise<void> {
  const res = await fetch(
    `https://graph.facebook.com/${IG_GRAPH_VERSION}/${igUserId}/subscribed_apps`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        subscribed_fields: IG_SUBSCRIBED_FIELDS,
        access_token: pageToken,
      }).toString(),
    }
  );
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message ?? `IG subscribe failed (${res.status})`);
  }
}

// Redirect back to OMS with a status flag the page can toast on.
function bounce(res: any, params: Record<string, string>) {
  const url = new URL(getOmsReturnUrl());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  res.redirect(302, url.toString());
}

// ────────────────────────────────────────────────────────────────────────────
// STEP 1 — Start: validate plan, redirect to Facebook OAuth dialog.
//   GET /fbConnectStart?org=<orgId>
// ────────────────────────────────────────────────────────────────────────────
export const fbConnectStart = onRequest(
  { region: "asia-southeast1", cors: true, secrets: ["META_APP_SECRET"] },
  async (req, res) => {
    const orgId = (req.query.org as string) ?? "";
    if (!orgId) {
      res.status(400).json({ error: "Missing org parameter" });
      return;
    }

    const plan = await getOrgPlan(orgId);
    if (!PAID_PLANS.has(plan)) {
      // Free plan → send back with an upgrade flag; the OMS page shows the popup.
      bounce(res, { fb_connect: "upgrade_required", plan });
      return;
    }

    const state = signState({ orgId, ts: Date.now(), nonce: crypto.randomUUID() });
    const url = new URL(FB_OAUTH_DIALOG);
    url.searchParams.set("client_id", META_APP_ID);
    url.searchParams.set("redirect_uri", getCallbackUrl());
    url.searchParams.set("state", state);
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("response_type", "code");
    // Force the account/page picker so the admin can choose which pages to grant.
    url.searchParams.set("auth_type", "rerequest");

    logger.info(`[fbConnectStart] org=${orgId} plan=${plan} → OAuth dialog`);
    res.redirect(302, url.toString());
  }
);

// ────────────────────────────────────────────────────────────────────────────
// STEP 2 — Callback: exchange tokens, persist pages + IG, subscribe webhooks.
//   GET /fbConnectCallback?code=...&state=...
// ────────────────────────────────────────────────────────────────────────────
export const fbConnectCallback = onRequest(
  { region: "asia-southeast1", cors: true, secrets: ["META_APP_SECRET"] },
  async (req, res) => {
    // User cancelled the dialog.
    if (req.query.error) {
      logger.warn(`[fbConnectCallback] user denied: ${req.query.error_description ?? req.query.error}`);
      bounce(res, { fb_connect: "cancelled" });
      return;
    }

    const code = (req.query.code as string) ?? "";
    const state = (req.query.state as string) ?? "";
    const payload = verifyState(state);
    if (!code || !payload) {
      logger.warn("[fbConnectCallback] invalid code/state");
      bounce(res, { fb_connect: "error", reason: "invalid_state" });
      return;
    }
    const orgId = payload.orgId as string;

    const appSecret = getAppSecret();
    if (!appSecret) {
      logger.error("[fbConnectCallback] META_APP_SECRET not configured");
      bounce(res, { fb_connect: "error", reason: "server_config" });
      return;
    }

    try {
      // 2a. auth code → short-lived user token
      const short = await graphGet("oauth/access_token", {
        client_id: META_APP_ID,
        client_secret: appSecret,
        redirect_uri: getCallbackUrl(),
        code,
      });
      const shortToken = short.access_token as string;

      // 2b. short-lived → long-lived user token (~60 days)
      const long = await graphGet("oauth/access_token", {
        grant_type: "fb_exchange_token",
        client_id: META_APP_ID,
        client_secret: appSecret,
        fb_exchange_token: shortToken,
      });
      const longToken = long.access_token as string;

      // 2c. /me/accounts → pages + PERMANENT page tokens.
      // Page tokens derived from a long-lived user token do not expire while the
      // user keeps the permission granted — these are what we persist.
      const accounts = await graphGet("me/accounts", {
        access_token: longToken,
        fields: "id,name,access_token,instagram_business_account{id,username}",
        limit: "100",
      });

      const pages: any[] = accounts.data ?? [];
      if (pages.length === 0) {
        logger.warn(`[fbConnectCallback] org=${orgId} granted 0 pages`);
        bounce(res, { fb_connect: "no_pages" });
        return;
      }

      const db = getDb();
      let fbCount = 0;
      let igCount = 0;

      for (const page of pages) {
        const pageId = String(page.id);
        const pageName = String(page.name ?? "");
        const pageToken = String(page.access_token ?? "");
        if (!pageToken) continue;

        // 2d. Subscribe the Page to the Messenger webhook.
        try {
          await subscribeFacebookPage(pageId, pageToken);
          logger.info(`[fbConnectCallback] subscribed FB page ${pageName} (${pageId})`);
        } catch (subErr: any) {
          // Non-fatal: still save so the admin can retry subscription.
          logger.error(`[fbConnectCallback] FB subscribe failed for ${pageId}: ${subErr.message}`);
        }

        // 2e. Upsert the Facebook social_account (dedup on orgId + pageId).
        await upsertSocialAccount(db, orgId, {
          platform: "facebook",
          programName: pageName,
          displayName: `${pageName} (Messenger)`,
          matchField: "credentials.pageId",
          matchValue: pageId,
          credentials: { pageId, pageName, pageAccessToken: pageToken },
        });
        fbCount++;

        // 2f. If the page has a linked IG business account, subscribe + save it.
        const ig = page.instagram_business_account;
        if (ig?.id) {
          const igUserId = String(ig.id);
          const igUsername = ig.username ? String(ig.username) : undefined;

          try {
            await subscribeInstagram(igUserId, pageToken);
            logger.info(`[fbConnectCallback] subscribed IG ${igUsername ?? igUserId}`);
          } catch (igErr: any) {
            logger.error(`[fbConnectCallback] IG subscribe failed for ${igUserId}: ${igErr.message}`);
          }

          await upsertSocialAccount(db, orgId, {
            platform: "instagram",
            programName: pageName,
            displayName: igUsername ? `@${igUsername}` : `IG ${igUserId.slice(-4)}`,
            matchField: "credentials.igUserId",
            matchValue: igUserId,
            credentials: {
              igUserId,
              igUsername,
              pageAccessToken: pageToken, // IG messaging uses the linked page token
              linkedFacebookPageId: pageId,
            },
          });
          igCount++;
        }
      }

      clearSocialAccountCache();
      logger.info(`[fbConnectCallback] org=${orgId} saved fb=${fbCount} ig=${igCount}`);
      bounce(res, { fb_connect: "success", fb: String(fbCount), ig: String(igCount) });
    } catch (err: any) {
      logger.error("[fbConnectCallback] token exchange failed", err);
      bounce(res, { fb_connect: "error", reason: (err.message ?? "exchange_failed").slice(0, 120) });
    }
  }
);

// ── Upsert helper ────────────────────────────────────────────────────────────
// Creates or updates a social_accounts doc, keyed by (orgId, platform, matchValue).
// Preserves an existing doc's programName/aiSettings tweaks; refreshes credentials
// + reactivates. Writes via Admin SDK, which bypasses Firestore security rules.
async function upsertSocialAccount(
  db: Firestore,
  orgId: string,
  opts: {
    platform: "facebook" | "instagram";
    programName: string;
    displayName: string;
    matchField: string;
    matchValue: string;
    credentials: Record<string, any>;
  }
): Promise<void> {
  const existing = await db
    .collection("social_accounts")
    .where("orgId", "==", orgId)
    .where("platform", "==", opts.platform)
    .where(opts.matchField, "==", opts.matchValue)
    .limit(1)
    .get();

  if (!existing.empty) {
    await existing.docs[0].ref.update({
      credentials: opts.credentials,
      isActive: true,
      connectedVia: "oauth",
      updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  await db.collection("social_accounts").add({
    orgId,
    platform: opts.platform,
    programName: opts.programName,
    displayName: opts.displayName,
    credentials: opts.credentials,
    aiSettings: { enabled: true, autoReply: false },
    isActive: true,
    connectedVia: "oauth",
    createdBy: "oauth",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}