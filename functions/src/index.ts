import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { setGlobalOptions, logger } from "firebase-functions/v2";
import { processIncomingMessage } from "./webhook-processor";
import { downloadAndUploadMedia, categorizeMimeType } from "./media-helper";
import {
  getSocialAccountById,
  getSocialAccountByFacebookPageId,
  getSocialAccountByInstagramUserId,
  getSocialAccountByWhatsappPhoneId,
  getSocialAccountByFonnteDevice,
} from "./social-accounts";
import type { SocialAccountDoc } from "./social-accounts";
import * as admin from "firebase-admin";

// Set region to asia-southeast1 (Singapore) — closest to Indonesia
setGlobalOptions({ region: "asia-southeast1" });

// Lazy init Firebase Admin
function getApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!;
  return admin.initializeApp();
}

function getDb() {
  return getApp().firestore();
}

// ────────────────────────────────────────────────────────────────────────────
// Helper: get channel config from organization document (LEGACY FALLBACK)
// Used when social_accounts lookup returns null (no account configured yet)
// ────────────────────────────────────────────────────────────────────────────
async function getChannelConfig(orgId: string): Promise<Record<string, any>> {
  try {
    const doc = await getDb().collection("organizations").doc(orgId).get();
    if (!doc.exists) return {};
    return doc.data()?.channelConfig ?? {};
  } catch (err) {
    logger.error("[getChannelConfig] Failed:", err);
    return {};
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Helper: fetch real user name from Meta Graph API (FB Messenger / Instagram)
// ────────────────────────────────────────────────────────────────────────────
async function fetchMetaUserProfile(
  psid: string,
  pageAccessToken: string,
  platform: "Facebook" | "Instagram"
): Promise<string> {
  const fallback = `${platform} User ${psid.slice(-4)}`;
  if (!pageAccessToken || !psid) return fallback;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${psid}?fields=name&access_token=${pageAccessToken}`
    );
    if (!response.ok) {
      logger.warn(`[fetchMetaUserProfile] Graph API ${response.status} for ${platform} PSID ${psid}`);
      return fallback;
    }
    const data: any = await response.json();
    const name = data?.name ?? "";
    if (name.trim().length > 0) {
      logger.info(`[fetchMetaUserProfile] ${platform} PSID ${psid} → "${name}"`);
      return name.trim();
    }
    return fallback;
  } catch (err) {
    logger.error(`[fetchMetaUserProfile] Error for ${platform}:`, err);
    return fallback;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Helper: get credentials for outbound — social_accounts first, fallback org
// ────────────────────────────────────────────────────────────────────────────
async function getOutboundCredentials(
  ticket: Record<string, any>,
  orgId: string
): Promise<{ account: SocialAccountDoc | null; config: Record<string, any> }> {
  // Try social_accounts first (via ticket.socialAccountId)
  if (ticket.socialAccountId) {
    const account = await getSocialAccountById(ticket.socialAccountId);
    if (account) return { account, config: {} };
  }
  // Fallback to organization channelConfig
  if (!orgId) {
    logger.warn("[getOutboundCredentials] No socialAccountId and no orgId — cannot get credentials");
    return { account: null, config: {} };
  }
  const config = await getChannelConfig(orgId);
  return { account: null, config };
}

// ────────────────────────────────────────────────────────────────────────────
// OUTBOUND REPLY TRIGGER
// When an agent/AI sends a message, auto-send it to the respondent
// via the original channel.
// NEW: Tries social_accounts credentials first, falls back to org.channelConfig
// ────────────────────────────────────────────────────────────────────────────
export const onMessageCreated = onDocumentCreated(
  "tickets/{ticketId}/messages/{messageId}",
  async (event) => {
    const message = event.data?.data();
    if (!message) return;

    const outboundRoles = ["agent", "admin", "supervisor", "ai"];
    if (!outboundRoles.includes(message.senderRole) || message.isInternal) return;

    const ticketId = event.params.ticketId;
    const db = getDb();

    try {
      const ticketDoc = await db.doc(`tickets/${ticketId}`).get();
      if (!ticketDoc.exists) { logger.error("[onMessageCreated] Ticket not found:", ticketId); return; }
      const ticket = ticketDoc.data()!;
      const channel = ticket.channel ?? "";
      const orgId = ticket.orgId ?? "";

      const respondentDoc = await db.doc(`respondents/${ticket.respondentId}`).get();
      if (!respondentDoc.exists) { logger.error("[onMessageCreated] Respondent not found:", ticket.respondentId); return; }
      const respondent = respondentDoc.data()!;
      const phone = respondent.phone ?? respondent.channelSenderId ?? "";

      if (!phone && channel !== "facebook" && channel !== "instagram") {
        logger.warn("[onMessageCreated] No phone/senderId for respondent");
        return;
      }

      // Get credentials — social_accounts first, fallback to org config
      const { account, config } = await getOutboundCredentials(ticket, orgId);

      // ── Send via Fonnte (WhatsApp) ──
      if (channel === "whatsapp_fonnte" || channel === "manual" ||
          config.active_whatsapp_provider === "fonnte") {
        const token = account?.credentials?.token ?? config.fonnte_token ?? "";
        if (!token) { logger.warn("[onMessageCreated] Fonnte token not configured"); return; }

        const cleanPhone = phone.replace(/^\+/, "");
        const response = await fetch("https://api.fonnte.com/send", {
          method: "POST",
          headers: { "Authorization": token },
          body: new URLSearchParams({ target: cleanPhone, message: message.content, type: "text" }),
        });
        const result = await response.json();
        logger.info(`[onMessageCreated] Fonnte → ${cleanPhone}:`, JSON.stringify(result));
      }

      // ── Send via Meta WhatsApp Cloud API ──
      else if (channel === "whatsapp_meta" || config.active_whatsapp_provider === "meta") {
        const waToken = account?.credentials?.accessToken ?? config.whatsapp_access_token ?? "";
        const waPhoneId = account?.credentials?.phoneNumberId ?? config.whatsapp_phone_number_id ?? "";
        if (!waToken || !waPhoneId) { logger.warn("[onMessageCreated] Meta WA credentials not configured"); return; }

        const cleanPhone = phone.replace(/^\+/, "");
        const response = await fetch(`https://graph.facebook.com/v18.0/${waPhoneId}/messages`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${waToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", to: cleanPhone, type: "text", text: { body: message.content } }),
        });
        const result = await response.json();
        logger.info(`[onMessageCreated] Meta WA → ${cleanPhone}:`, JSON.stringify(result));
      }

      // ── Facebook Messenger ──
      else if (channel === "facebook") {
        const fbToken = account?.credentials?.pageAccessToken ?? config.facebook_page_access_token ?? "";
        if (!fbToken) { logger.warn("[onMessageCreated] Facebook page token not configured"); return; }

        const recipientId = respondent.channelSenderId ?? "";
        if (!recipientId) { logger.warn("[onMessageCreated] No channelSenderId for Facebook"); return; }

        const response = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${fbToken}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipient: { id: recipientId }, message: { text: message.content }, messaging_type: "RESPONSE" }),
        });
        const result = await response.json();
        logger.info(`[onMessageCreated] FB Messenger → ${recipientId}:`, JSON.stringify(result));
      }

      // ── Instagram DM ──
      else if (channel === "instagram") {
        const igToken = account?.credentials?.pageAccessToken ?? config.instagram_access_token ?? config.facebook_page_access_token ?? "";
        if (!igToken) { logger.warn("[onMessageCreated] Instagram token not configured"); return; }

        const recipientId = respondent.channelSenderId ?? "";
        if (!recipientId) { logger.warn("[onMessageCreated] No channelSenderId for Instagram"); return; }

        const response = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${igToken}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipient: { id: recipientId }, message: { text: message.content } }),
        });
        const result = await response.json();
        logger.info(`[onMessageCreated] IG DM → ${recipientId}:`, JSON.stringify(result));
      }

      else {
        logger.info(`[onMessageCreated] Channel "${channel}" — no outbound configured`);
      }

    } catch (err) {
      logger.error("[onMessageCreated] Error:", err);
    }
  }
);

// ────────────────────────────────────────────────────────────────────────────
// 1. WhatsApp Business Cloud API (Meta)
//    Lookup: entry[].changes[].value.metadata.phone_number_id → social_accounts
// ────────────────────────────────────────────────────────────────────────────
export const webhookWhatsapp = onRequest({ cors: true }, async (req, res) => {
  const WA_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "rts_wa_token";

  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === WA_VERIFY_TOKEN) { res.status(200).send(challenge); }
    else { res.status(403).json({ error: "Forbidden" }); }
    return;
  }

  if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

  const orgId = req.query.org as string;
  if (!orgId) { res.status(400).json({ error: "Missing org parameter" }); return; }

  try {
    const body = req.body;
    const value = body?.entry?.[0]?.changes?.[0]?.value;

    if (value?.messages?.length) {
      // Extract phone_number_id for social_accounts lookup
      const phoneNumberId = value?.metadata?.phone_number_id ?? "";
      let account: SocialAccountDoc | null = null;
      if (phoneNumberId) {
        account = await getSocialAccountByWhatsappPhoneId(phoneNumberId);
        if (account) logger.info(`[webhookWhatsapp] Matched social_account: ${account.displayName} (${account.id})`);
      }

      for (const msg of value.messages as any[]) {
        if (msg.type !== "text") continue;
        const contact = (value.contacts as any[])?.find((c: any) => c.wa_id === msg.from);
        const phone = `+${msg.from}`;
        await processIncomingMessage({
          orgId,
          channel: "whatsapp_meta",
          senderId: msg.from,
          senderName: contact?.profile?.name ?? phone,
          senderPhone: phone,
          message: msg.text?.body ?? "(pesan kosong)",
          rawPayload: body,
          socialAccountId: account?.id,
          programName: account?.programName,
        });
      }
    }
    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("[webhookWhatsapp]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 2. WhatsApp via Fonnte / Wablas (POST only)
//    Lookup: body.device (device phone number) → social_accounts
// ────────────────────────────────────────────────────────────────────────────
export const webhookFonnte = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

  const orgId = req.query.org as string;
  if (!orgId) { res.status(400).json({ error: "Missing org parameter" }); return; }

  try {
    const body = req.body;
    const sender = String(body.sender ?? "").replace(/\D/g, "");
    const phone = sender.startsWith("+") ? sender : `+${sender}`;
    const name = String(body.name ?? phone);
    const message = String(body.message ?? "");
    const device = String(body.device ?? "").replace(/\D/g, "");

    logger.info(`[webhookFonnte] Incoming — sender: ${sender}, device: ${device}, fromMe: ${body.fromMe}, message: "${message.substring(0, 50)}..."`);

    // ── Echo detection ──
    const isEcho = body.fromMe === true || body.from_me === true ||
                   body.isFromMe === true || body.is_from_me === true ||
                   message.includes("_Sent via fonnte.com_") ||
                   message.includes("Sent via fonnte") ||
                   body.status === "sent" || body.status === "delivered" || body.status === "read" ||
                   (device && sender === device) ||
                   !message.trim();

    if (isEcho) { res.status(200).json({ status: "ok", skipped: "echo" }); return; }

    // ── Social accounts lookup by device number ──
    let account: SocialAccountDoc | null = null;
    if (device) {
      account = await getSocialAccountByFonnteDevice(device);
      if (account) logger.info(`[webhookFonnte] Matched social_account: ${account.displayName} (${account.id})`);
    }

    // ── Self-loop / echo prevention via org config (fallback) ──
    const db = getDb();
    const orgDoc = await db.doc(`organizations/${orgId}`).get();

    // Check own number
    const ownNumber = account?.credentials?.deviceNumber
      ?? String(orgDoc.exists ? (orgDoc.data()?.channelConfig?.fonnte_device_number ?? "") : "").replace(/\D/g, "");
    if (ownNumber && sender === ownNumber) {
      res.status(200).json({ status: "ok", skipped: "self-message" });
      return;
    }

    // Anti-echo: check last AI reply
    if (message.trim() && orgDoc.exists) {
      const lastAIReply = orgDoc.data()?.channelConfig?.last_ai_reply ?? "";
      if (lastAIReply && message.trim() === lastAIReply.trim()) {
        logger.info(`[webhookFonnte] Skipping echo — message matches last AI reply`);
        res.status(200).json({ status: "ok", skipped: "echo-duplicate" });
        return;
      }
    }

    // Parse attachments
    const attachments = await parseFonnteAttachments(body);

    await processIncomingMessage({
      orgId,
      channel: "whatsapp_fonnte",
      senderId: String(body.sender ?? ""),
      senderName: name,
      senderPhone: phone,
      message: message || "",
      attachments: attachments.length > 0 ? attachments : undefined,
      rawPayload: body,
      socialAccountId: account?.id,
      programName: account?.programName,
    });
    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("[webhookFonnte]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// Parse Fonnte attachments
async function parseFonnteAttachments(body: any): Promise<any[]> {
  const attachments: any[] = [];
  const mediaUrl = body.url ?? body.media ?? body.file;
  const mediaType = (body.type ?? "").toLowerCase();

  if (mediaUrl && mediaType && mediaType !== "text") {
    const tempTicketId = "incoming";
    const tempMessageId = `fonnte_${Date.now()}`;
    const uploaded = await downloadAndUploadMedia(mediaUrl, tempTicketId, tempMessageId);
    if (uploaded) {
      attachments.push({
        type: categorizeMimeType(uploaded.mimeType) || mediaType,
        url: uploaded.url,
        originalUrl: mediaUrl,
        mimeType: uploaded.mimeType,
        filename: body.filename ?? uploaded.filename,
        size: uploaded.size,
        caption: body.message ?? "",
      });
    }
  }
  return attachments;
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Instagram Direct Message (Meta)
//    Lookup: entry[].id (IG Business Account ID) → social_accounts
// ────────────────────────────────────────────────────────────────────────────
export const webhookInstagram = onRequest({ cors: true }, async (req, res) => {
  const IG_VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN ?? "rts_ig_token";

  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === IG_VERIFY_TOKEN) { res.status(200).send(challenge); }
    else { res.status(403).json({ error: "Forbidden" }); }
    return;
  }

  if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

  const orgId = req.query.org as string;
  if (!orgId) { res.status(400).json({ error: "Missing org parameter" }); return; }

  try {
    const body = req.body;
    const messaging = body?.entry?.[0]?.messaging ?? [];
    const igAccountId = String(body?.entry?.[0]?.id ?? "");

    // ── Social accounts lookup by IG Account ID ──
    let account: SocialAccountDoc | null = null;
    if (igAccountId) {
      account = await getSocialAccountByInstagramUserId(igAccountId);
      if (account) logger.info(`[webhookInstagram] Matched social_account: ${account.displayName} (${account.id})`);
    }

    // Get token: social_accounts first, fallback to org config
    const igToken = account?.credentials?.pageAccessToken
      ?? (await getChannelConfig(orgId)).instagram_access_token
      ?? (await getChannelConfig(orgId)).facebook_page_access_token
      ?? "";

    for (const event of messaging as any[]) {
      if (!event.message?.text) continue;
      const senderId = String(event.sender?.id ?? "");

      const senderName = igToken
        ? await fetchMetaUserProfile(senderId, igToken, "Instagram")
        : `Instagram User ${senderId.slice(-4)}`;

      await processIncomingMessage({
        orgId,
        channel: "instagram",
        senderId,
        senderName,
        message: event.message.text,
        rawPayload: body,
        socialAccountId: account?.id,
        programName: account?.programName,
      });
    }
    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("[webhookInstagram]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Facebook Messenger (Meta)
//    Lookup: entry[].id (Page ID) → social_accounts
// ────────────────────────────────────────────────────────────────────────────
export const webhookFacebook = onRequest({ cors: true }, async (req, res) => {
  const FB_VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN ?? "rts_fb_token";

  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === FB_VERIFY_TOKEN) { res.status(200).send(challenge); }
    else { res.status(403).json({ error: "Forbidden" }); }
    return;
  }

  if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

  const orgId = req.query.org as string;
  if (!orgId) { res.status(400).json({ error: "Missing org parameter" }); return; }

  try {
    const body = req.body;
    const messaging = body?.entry?.[0]?.messaging ?? [];
    const pageId = String(body?.entry?.[0]?.id ?? "");

    // ── Social accounts lookup by Page ID ──
    let account: SocialAccountDoc | null = null;
    if (pageId) {
      account = await getSocialAccountByFacebookPageId(pageId);
      if (account) logger.info(`[webhookFacebook] Matched social_account: ${account.displayName} (${account.id})`);
    }

    // Get token: social_accounts first, fallback to org config
    const pageToken = account?.credentials?.pageAccessToken
      ?? (await getChannelConfig(orgId)).facebook_page_access_token
      ?? "";

    for (const event of messaging as any[]) {
      if (!event.message?.text) continue;
      const senderId = String(event.sender?.id ?? "");

      const senderName = pageToken
        ? await fetchMetaUserProfile(senderId, pageToken, "Facebook")
        : `Facebook User ${senderId.slice(-4)}`;

      await processIncomingMessage({
        orgId,
        channel: "facebook",
        senderId,
        senderName,
        message: event.message.text,
        rawPayload: body,
        socialAccountId: account?.id,
        programName: account?.programName,
      });
    }
    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("[webhookFacebook]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Inbound Call log (VOIP / PBX / manual)
//    No social_accounts lookup — uses orgId only
// ────────────────────────────────────────────────────────────────────────────
export const webhookCall = onRequest({ cors: true }, async (req, res) => {
  const CALL_TOKEN = process.env.CALL_WEBHOOK_TOKEN ?? "";

  if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

  const authHeader = req.headers["authorization"] ?? "";
  if (CALL_TOKEN && authHeader.replace("Bearer ", "") !== CALL_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const body = req.body;
    const phone = String(body.phone ?? "").trim();
    if (!phone) { res.status(400).json({ error: "phone is required" }); return; }

    const orgId = req.query.org as string;
    if (!orgId) { res.status(400).json({ error: "Missing org parameter" }); return; }

    const name = String(body.name ?? phone);
    const message = String(body.subject ?? body.notes ?? "Inbound call");

    await processIncomingMessage({
      orgId,
      channel: "call",
      senderId: phone,
      senderName: name,
      senderPhone: phone,
      message,
      rawPayload: body,
    });
    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("[webhookCall]", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// AI AUTO-REPLY TRIGGER
// Config read from organizations/{orgId}.aiConfig
// (Future: override per social_account via aiSettings)
// ────────────────────────────────────────────────────────────────────────────
export const onRespondentMessage = onDocumentCreated(
  {
    document: "tickets/{ticketId}/messages/{messageId}",
    timeoutSeconds: 60,
  },
  async (event) => {
    const message = event.data?.data();
    if (!message) return;

    if (message.senderRole !== "respondent" || message.isInternal) return;

    const ticketId = event.params.ticketId;
    const db = getDb();

    try {
      const ticketDoc = await db.doc(`tickets/${ticketId}`).get();
      if (!ticketDoc.exists) return;
      const ticket = ticketDoc.data()!;

      if (ticket.handledBy === "human" || ticket.handledBy === "escalated") {
        logger.info(`[onRespondentMessage] Ticket ${ticketId} is ${ticket.handledBy}, skipping AI`);
        return;
      }

      const orgId = ticket.orgId ?? "";
      if (!orgId) { logger.info("[onRespondentMessage] No orgId on ticket"); return; }

      const orgDoc = await db.doc(`organizations/${orgId}`).get();
      if (!orgDoc.exists) { logger.info("[onRespondentMessage] Organization not found"); return; }
      const aiConfig = orgDoc.data()?.aiConfig ?? {};

      if (!aiConfig.enabled || !aiConfig.autoReply) {
        logger.info("[onRespondentMessage] AI disabled or autoReply off");
        return;
      }

      // Idempotency checks
      const messageId = event.params.messageId;
      const messageCreatedAt = message.createdAt?.toMillis?.() ?? Date.now();

      const recentMessages = await db.collection(`tickets/${ticketId}/messages`)
        .orderBy("createdAt", "desc").limit(5).get();
      const now = Date.now();
      const hasRecentAI = recentMessages.docs.some((d) => {
        const data = d.data();
        if (data.senderRole !== "ai") return false;
        return (now - (data.createdAt?.toMillis?.() ?? 0)) < 5000;
      });
      if (hasRecentAI) {
        logger.info(`[onRespondentMessage] AI replied within last 5s, skipping`);
        return;
      }

      const laterMessages = await db.collection(`tickets/${ticketId}/messages`)
        .where("createdAt", ">", new Date(messageCreatedAt)).limit(5).get();
      const alreadyReplied = laterMessages.docs.some((d) => {
        const data = d.data();
        return data.senderRole === "ai" && data.aiGenerated === true;
      });
      if (alreadyReplied) {
        logger.info(`[onRespondentMessage] Already replied to ${messageId}, skipping`);
        return;
      }

      // Channel toggle check
      const channel = ticket.channel ?? "";
      const channelToggles = aiConfig.channelToggles ?? {};
      const channelKey =
        channel === "whatsapp_fonnte" || channel === "whatsapp_meta" ? "WhatsApp" :
        channel === "facebook" ? "Facebook" :
        channel === "instagram" ? "Instagram" :
        channel === "call" ? "Call" : channel;
      if (channelToggles[channelKey] === false) {
        logger.info(`[onRespondentMessage] AI disabled for channel ${channelKey}`);
        return;
      }

      // ── Escalation triggers ──
      const messageContent = (message.content ?? "").toLowerCase();
      const triggers = aiConfig.escalationTriggers ?? [];
      let detectedTrigger: string | null = null;

      for (const trigger of triggers) {
        if (!trigger.enabled) continue;
        for (const kw of (trigger.keywords ?? []) as string[]) {
          if (messageContent.includes(kw.toLowerCase())) {
            detectedTrigger = trigger.reason;
            break;
          }
        }
        if (detectedTrigger) break;
      }

      if (detectedTrigger) {
        logger.info(`[onRespondentMessage] Escalation detected: ${detectedTrigger}`);
        await db.doc(`tickets/${ticketId}`).update({
          handledBy: "escalated",
          escalation: detectedTrigger,
          priority: "high",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await db.collection(`tickets/${ticketId}/messages`).add({
          senderId: "system", senderName: "System", senderRole: "system",
          content: `⚠️ Escalated to human agent (trigger: ${detectedTrigger})`,
          isInternal: true, createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const escalationReply = aiConfig.escalationReplyMessage
          ?? "Thank you for reaching out. I'm connecting you with a team member who can assist you personally. They'll be with you shortly! 🙏";
        await db.collection(`tickets/${ticketId}/messages`).add({
          senderId: "ai_assistant", senderName: "AI Assistant", senderRole: "ai",
          content: escalationReply, isInternal: false, aiGenerated: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        try {
          await db.doc(`organizations/${orgId}`).update({ "channelConfig.last_ai_reply": escalationReply });
        } catch (e) { /* non-critical */ }

        // Emergency notification
        try {
          const orgData = orgDoc.data();
          const emergencyContacts = orgData?.emergencyContacts ?? [];
          const channelConfig = orgData?.channelConfig ?? {};
          const fonnteToken = channelConfig.fonnte_token ?? "";

          const respondentDoc = await db.doc(`respondents/${ticket.respondentId}`).get();
          const respondentName = respondentDoc.exists ? (respondentDoc.data()?.displayName ?? "Unknown") : "Unknown";
          const ticketNumber = ticket.ticketNumber ?? ticketId;

          if (fonnteToken && emergencyContacts.length > 0) {
            const alertMessage = `🚨 *URGENT ESCALATION*\n\nRespondent: *${respondentName}*\nTicket: *${ticketNumber}*\nTrigger: *${detectedTrigger}*\nMessage: "${messageContent.substring(0, 200)}"\n\n⚡ Please check the dashboard immediately.\n🔗 https://outreachcbn.com/dashboard/tickets/${ticketId}`;
            for (const contact of emergencyContacts) {
              const contactPhone = String(contact.phone ?? "").replace(/\D/g, "");
              if (!contactPhone) continue;
              try {
                await fetch("https://api.fonnte.com/send", {
                  method: "POST",
                  headers: { "Authorization": fonnteToken, "Content-Type": "application/json" },
                  body: JSON.stringify({ target: contactPhone, message: alertMessage }),
                });
                logger.info(`[onRespondentMessage] Emergency alert sent to ${contact.name}`);
              } catch (sendErr) { logger.error(`[onRespondentMessage] Alert failed:`, sendErr); }
            }
          }
        } catch (alertErr) { logger.error("[onRespondentMessage] Emergency alert error:", alertErr); }

        return;
      }

      // ── Call AI API ──
      const provider = aiConfig.provider ?? "openai";
      const apiKey = aiConfig.apiKey ?? "";
      const model = aiConfig.model ?? "gpt-4o-mini";
      const systemPrompt = aiConfig.systemPrompt ?? "You are a helpful assistant.";

      if (!apiKey) { logger.warn("[onRespondentMessage] No API key configured"); return; }

      const messagesSnap = await db.collection(`tickets/${ticketId}/messages`)
        .orderBy("createdAt", "desc").limit(10).get();
      const history = messagesSnap.docs.reverse()
        .filter((d) => !d.data().isInternal)
        .map((d) => {
          const m = d.data();
          return { role: m.senderRole === "respondent" ? "user" as const : "assistant" as const, content: m.content ?? "" };
        });

      let aiReply = "";

      if (provider === "openai") {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, ...history], max_tokens: 500, temperature: 0.7 }),
        });
        const result: any = await response.json();
        if (result.error) { logger.error("[onRespondentMessage] OpenAI error:", result.error); return; }
        aiReply = result.choices?.[0]?.message?.content ?? "";
      } else if (provider === "anthropic") {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
          body: JSON.stringify({ model, max_tokens: 500, system: systemPrompt, messages: history }),
        });
        const result: any = await response.json();
        if (result.error) { logger.error("[onRespondentMessage] Anthropic error:", result.error); return; }
        aiReply = result.content?.[0]?.text ?? "";
      }

      if (!aiReply.trim()) { logger.warn("[onRespondentMessage] AI returned empty reply"); return; }

      await db.collection(`tickets/${ticketId}/messages`).add({
        senderId: "ai_assistant", senderName: "AI Assistant", senderRole: "ai",
        content: aiReply.trim(), isInternal: false, aiGenerated: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await db.doc(`tickets/${ticketId}`).update({
        handledBy: "ai",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      try {
        await db.doc(`organizations/${orgId}`).update({ "channelConfig.last_ai_reply": aiReply.trim() });
      } catch (e) { /* non-critical */ }

      logger.info(`[onRespondentMessage] AI replied to ticket ${ticketId}`);

      // Data extraction
      try {
        const respondentMessagesCount = history.filter((m) => m.role === "user").length;
        if (respondentMessagesCount >= 2 && respondentMessagesCount % 2 === 0) {
          await extractRespondentData(ticketId, ticket.respondentId, history, apiKey, model);
        }
      } catch (extractErr) {
        logger.error("[onRespondentMessage] Data extraction failed:", extractErr);
      }
    } catch (err) {
      logger.error("[onRespondentMessage] Error:", err);
    }
  }
);

// ────────────────────────────────────────────────────────────────────────────
// Extract respondent data from conversation using AI
// ────────────────────────────────────────────────────────────────────────────
async function extractRespondentData(
  ticketId: string,
  respondentId: string,
  history: Array<{ role: string; content: string }>,
  apiKey: string,
  model: string
): Promise<void> {
  const db = getDb();

  const respondentDoc = await db.doc(`respondents/${respondentId}`).get();
  if (!respondentDoc.exists) return;
  const respondent = respondentDoc.data()!;

  const needsExtraction = {
    fullName: !respondent.fullName || respondent.fullName.startsWith("+") || respondent.fullName.startsWith("Facebook User") || respondent.fullName.startsWith("WhatsApp User"),
    city: !respondent.city,
    age: !respondent.age,
    programSource: !respondent.programSource,
    problemCategories: !respondent.problemCategories || respondent.problemCategories.length === 0,
  };

  if (!Object.values(needsExtraction).some((v) => v)) return;

  const conversationText = history.map((m) => `${m.role === "user" ? "User" : "Counselor"}: ${m.content}`).join("\n");

  const extractionPrompt = `Analyze this conversation and extract information about the user. Return ONLY a valid JSON object with these fields (use null if not mentioned):

{
  "fullName": "user's full name or null",
  "city": "city of residence or null",
  "age": number or null,
  "programSource": "how user found CBN (TV, YouTube, Instagram, Facebook, friend, website, etc.) or null",
  "problemCategories": ["array of problem keywords like: illness, family, financial, marriage, grief, anxiety, depression, addiction, spiritual_question, salvation, counseling, prayer_request"]
}

IMPORTANT:
- Return ONLY the JSON object, no markdown, no explanation
- Use null for fields that are not clearly mentioned
- For names, only extract if user clearly states their name
- For age, extract numbers only
- For problemCategories, identify key issues the user is facing

Conversation:
${conversationText}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a data extraction assistant. Return only valid JSON." },
          { role: "user", content: extractionPrompt },
        ],
        max_tokens: 300, temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    const result: any = await response.json();
    if (result.error) { logger.error("[extractRespondentData] OpenAI error:", result.error); return; }

    const extractedText = result.choices?.[0]?.message?.content ?? "{}";
    let extracted: any;
    try { extracted = JSON.parse(extractedText); }
    catch { logger.error("[extractRespondentData] Failed to parse JSON:", extractedText); return; }

    const updates: Record<string, any> = {};
    const updatedFields: string[] = [];

    if (needsExtraction.fullName && extracted.fullName && typeof extracted.fullName === "string" && extracted.fullName.trim().length > 0) {
      updates.fullName = extracted.fullName.trim(); updatedFields.push("name");
    }
    if (needsExtraction.city && extracted.city && typeof extracted.city === "string" && extracted.city.trim().length > 0) {
      updates.city = extracted.city.trim(); updatedFields.push("city");
    }
    if (needsExtraction.age && extracted.age && typeof extracted.age === "number" && extracted.age > 0 && extracted.age < 120) {
      updates.age = extracted.age; updatedFields.push("age");
    }
    if (needsExtraction.programSource && extracted.programSource && typeof extracted.programSource === "string" && extracted.programSource.trim().length > 0) {
      updates.programSource = extracted.programSource.trim(); updatedFields.push("source");
    }
    if (needsExtraction.problemCategories && Array.isArray(extracted.problemCategories) && extracted.problemCategories.length > 0) {
      const valid = extracted.problemCategories.filter((c: any) => typeof c === "string" && c.trim().length > 0);
      if (valid.length > 0) { updates.problemCategories = valid; updatedFields.push("categories"); }
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      await db.doc(`respondents/${respondentId}`).update(updates);
      await db.collection(`tickets/${ticketId}/messages`).add({
        senderId: "system", senderName: "System", senderRole: "system",
        content: `🤖 Data extracted by AI: ${updatedFields.join(", ")}`,
        isInternal: true, createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      logger.info(`[extractRespondentData] Updated ${respondentId}: ${updatedFields.join(", ")}`);
    }
  } catch (err) {
    logger.error("[extractRespondentData] Extraction failed:", err);
  }
}