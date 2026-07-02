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

setGlobalOptions({ region: "asia-southeast1" });

function getApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!;
  return admin.initializeApp();
}

function getDb() {
  return getApp().firestore();
}

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

async function fetchMetaUserProfile(
  psid: string,
  pageAccessToken: string,
  platform: "Facebook" | "Instagram"
): Promise<string> {
  const fallback = `${platform} User ${psid.slice(-4)}`;
  if (!pageAccessToken || !psid) return fallback;
  try {
    // Instagram Login tokens (IGAA...) resolve profile via graph.instagram.com;
    // Facebook / Page-linked tokens (EAA...) via graph.facebook.com
    const profileUrl = (platform === "Instagram" && pageAccessToken.startsWith("IG"))
      ? `https://graph.instagram.com/v21.0/${psid}?fields=name,username&access_token=${pageAccessToken}`
      : `https://graph.facebook.com/v18.0/${psid}?fields=name&access_token=${pageAccessToken}`;
    const response = await fetch(profileUrl);
    if (!response.ok) {
      logger.warn(`[fetchMetaUserProfile] Graph API ${response.status} for ${platform} PSID ${psid}`);
      return fallback;
    }
    const data: any = await response.json();
    const name = (data?.name ?? data?.username ?? "").toString();
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

async function getOutboundCredentials(
  ticket: Record<string, any>,
  orgId: string
): Promise<{ account: SocialAccountDoc | null; config: Record<string, any> }> {
  if (ticket.socialAccountId) {
    const account = await getSocialAccountById(ticket.socialAccountId);
    if (account) return { account, config: {} };
  }
  if (!orgId) {
    logger.warn("[getOutboundCredentials] No socialAccountId and no orgId — cannot get credentials");
    return { account: null, config: {} };
  }
  const config = await getChannelConfig(orgId);
  return { account: null, config };
}

// ────────────────────────────────────────────────────────────────────────────
// OUTBOUND REPLY TRIGGER
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

      const { account, config } = await getOutboundCredentials(ticket, orgId);

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

      else if (channel === "instagram") {
        const igToken = account?.credentials?.pageAccessToken ?? config.instagram_access_token ?? config.facebook_page_access_token ?? "";
        if (!igToken) { logger.warn("[onMessageCreated] Instagram token not configured"); return; }
        const recipientId = respondent.channelSenderId ?? "";
        if (!recipientId) { logger.warn("[onMessageCreated] No channelSenderId for Instagram"); return; }
        // Instagram Login tokens (IGAA...) send via graph.instagram.com;
        // legacy Page-linked tokens (EAA...) send via graph.facebook.com
        const igApiBase = igToken.startsWith("IG")
          ? "https://graph.instagram.com/v21.0/me/messages"
          : "https://graph.facebook.com/v18.0/me/messages";
        const response = await fetch(`${igApiBase}?access_token=${igToken}`, {
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
          orgId, channel: "whatsapp_meta", senderId: msg.from,
          senderName: contact?.profile?.name ?? phone, senderPhone: phone,
          message: msg.text?.body ?? "(pesan kosong)", rawPayload: body,
          socialAccountId: account?.id, programName: account?.programName,
        });
      }
    }
    res.status(200).json({ status: "ok" });
  } catch (err) { console.error("[webhookWhatsapp]", err); res.status(500).json({ error: "Internal error" }); }
});

// ────────────────────────────────────────────────────────────────────────────
// 2. WhatsApp via Fonnte
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

    const isEcho = body.fromMe === true || body.from_me === true ||
                   body.isFromMe === true || body.is_from_me === true ||
                   message.includes("_Sent via fonnte.com_") || message.includes("Sent via fonnte") ||
                   body.status === "sent" || body.status === "delivered" || body.status === "read" ||
                   (device && sender === device) || !message.trim();
    if (isEcho) { res.status(200).json({ status: "ok", skipped: "echo" }); return; }

    let account: SocialAccountDoc | null = null;
    if (device) {
      account = await getSocialAccountByFonnteDevice(device);
      if (account) logger.info(`[webhookFonnte] Matched social_account: ${account.displayName} (${account.id})`);
    }

    const db = getDb();
    const orgDoc = await db.doc(`organizations/${orgId}`).get();
    const ownNumber = account?.credentials?.deviceNumber
      ?? String(orgDoc.exists ? (orgDoc.data()?.channelConfig?.fonnte_device_number ?? "") : "").replace(/\D/g, "");
    if (ownNumber && sender === ownNumber) { res.status(200).json({ status: "ok", skipped: "self-message" }); return; }

    if (message.trim() && orgDoc.exists) {
      const lastAIReply = orgDoc.data()?.channelConfig?.last_ai_reply ?? "";
      if (lastAIReply && message.trim() === lastAIReply.trim()) {
        logger.info(`[webhookFonnte] Skipping echo — message matches last AI reply`);
        res.status(200).json({ status: "ok", skipped: "echo-duplicate" }); return;
      }
    }

    const attachments = await parseFonnteAttachments(body);
    await processIncomingMessage({
      orgId, channel: "whatsapp_fonnte", senderId: String(body.sender ?? ""),
      senderName: name, senderPhone: phone, message: message || "",
      attachments: attachments.length > 0 ? attachments : undefined, rawPayload: body,
      socialAccountId: account?.id, programName: account?.programName,
    });
    res.status(200).json({ status: "ok" });
  } catch (err) { console.error("[webhookFonnte]", err); res.status(500).json({ error: "Internal error" }); }
});

async function parseFonnteAttachments(body: any): Promise<any[]> {
  const attachments: any[] = [];
  const mediaUrl = body.url ?? body.media ?? body.file;
  const mediaType = (body.type ?? "").toLowerCase();
  if (mediaUrl && mediaType && mediaType !== "text") {
    const uploaded = await downloadAndUploadMedia(mediaUrl, "incoming", `fonnte_${Date.now()}`);
    if (uploaded) {
      attachments.push({
        type: categorizeMimeType(uploaded.mimeType) || mediaType, url: uploaded.url,
        originalUrl: mediaUrl, mimeType: uploaded.mimeType,
        filename: body.filename ?? uploaded.filename, size: uploaded.size, caption: body.message ?? "",
      });
    }
  }
  return attachments;
}

// ────────────────────────────────────────────────────────────────────────────
// 3. Instagram Direct Message (Meta)
// ────────────────────────────────────────────────────────────────────────────
export const webhookInstagram = onRequest({ cors: true }, async (req, res) => {
  const IG_VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN ?? "rts_ig_token";
  if (req.method === "GET") {
    const mode = req.query["hub.mode"]; const token = req.query["hub.verify_token"]; const challenge = req.query["hub.challenge"];
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
    let account: SocialAccountDoc | null = null;
    if (igAccountId) {
      account = await getSocialAccountByInstagramUserId(igAccountId);
      if (account) logger.info(`[webhookInstagram] Matched social_account: ${account.displayName} (${account.id})`);
    }
    const igToken = account?.credentials?.pageAccessToken
      ?? (await getChannelConfig(orgId)).instagram_access_token
      ?? (await getChannelConfig(orgId)).facebook_page_access_token ?? "";

    for (const event of messaging as any[]) {
      if (!event.message?.text) continue;
      const senderId = String(event.sender?.id ?? "");
      const senderName = igToken ? await fetchMetaUserProfile(senderId, igToken, "Instagram") : `Instagram User ${senderId.slice(-4)}`;
      await processIncomingMessage({
        orgId, channel: "instagram", senderId, senderName,
        message: event.message.text, rawPayload: body,
        socialAccountId: account?.id, programName: account?.programName,
      });
    }
    res.status(200).json({ status: "ok" });
  } catch (err) { console.error("[webhookInstagram]", err); res.status(500).json({ error: "Internal error" }); }
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Facebook Messenger (Meta)
// ────────────────────────────────────────────────────────────────────────────
export const webhookFacebook = onRequest({ cors: true }, async (req, res) => {
  const FB_VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN ?? "rts_fb_token";
  if (req.method === "GET") {
    const mode = req.query["hub.mode"]; const token = req.query["hub.verify_token"]; const challenge = req.query["hub.challenge"];
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
    let account: SocialAccountDoc | null = null;
    if (pageId) {
      account = await getSocialAccountByFacebookPageId(pageId);
      if (account) logger.info(`[webhookFacebook] Matched social_account: ${account.displayName} (${account.id})`);
    }
    const pageToken = account?.credentials?.pageAccessToken
      ?? (await getChannelConfig(orgId)).facebook_page_access_token ?? "";

    for (const event of messaging as any[]) {
      if (!event.message?.text) continue;
      const senderId = String(event.sender?.id ?? "");
      const senderName = pageToken ? await fetchMetaUserProfile(senderId, pageToken, "Facebook") : `Facebook User ${senderId.slice(-4)}`;
      await processIncomingMessage({
        orgId, channel: "facebook", senderId, senderName,
        message: event.message.text, rawPayload: body,
        socialAccountId: account?.id, programName: account?.programName,
      });
    }
    res.status(200).json({ status: "ok" });
  } catch (err) { console.error("[webhookFacebook]", err); res.status(500).json({ error: "Internal error" }); }
});

// ────────────────────────────────────────────────────────────────────────────
// 5. Inbound Call
// ────────────────────────────────────────────────────────────────────────────
export const webhookCall = onRequest({ cors: true }, async (req, res) => {
  const CALL_TOKEN = process.env.CALL_WEBHOOK_TOKEN ?? "";
  if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
  const authHeader = req.headers["authorization"] ?? "";
  if (CALL_TOKEN && authHeader.replace("Bearer ", "") !== CALL_TOKEN) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const body = req.body;
    const phone = String(body.phone ?? "").trim();
    if (!phone) { res.status(400).json({ error: "phone is required" }); return; }
    const orgId = req.query.org as string;
    if (!orgId) { res.status(400).json({ error: "Missing org parameter" }); return; }
    const name = String(body.name ?? phone);
    const message = String(body.subject ?? body.notes ?? "Inbound call");
    await processIncomingMessage({
      orgId, channel: "call", senderId: phone, senderName: name,
      senderPhone: phone, message, rawPayload: body,
    });
    res.status(200).json({ status: "ok" });
  } catch (err) { console.error("[webhookCall]", err); res.status(500).json({ error: "Internal error" }); }
});

// ────────────────────────────────────────────────────────────────────────────
// AI AUTO-REPLY TRIGGER
// Flow: message → semantic classifier → CRISIS/HUMAN/NORMAL
// ────────────────────────────────────────────────────────────────────────────
export const onRespondentMessage = onDocumentCreated(
  { document: "tickets/{ticketId}/messages/{messageId}", timeoutSeconds: 60 },
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

      // ── API key — needed for classifier AND AI reply ──
      const apiKey = aiConfig.apiKey ?? "";
      if (!apiKey) { logger.warn("[onRespondentMessage] No API key configured"); return; }

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
      if (hasRecentAI) { logger.info(`[onRespondentMessage] AI replied within last 5s, skipping`); return; }

      const laterMessages = await db.collection(`tickets/${ticketId}/messages`)
        .where("createdAt", ">", new Date(messageCreatedAt)).limit(5).get();
      const alreadyReplied = laterMessages.docs.some((d) => {
        const data = d.data();
        return data.senderRole === "ai" && data.aiGenerated === true;
      });
      if (alreadyReplied) { logger.info(`[onRespondentMessage] Already replied to ${messageId}, skipping`); return; }

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

      // ── SEMANTIC CLASSIFIER — runs BEFORE AI reply ──
      const messageContent = (message.content ?? "").toLowerCase();
      let classification = "NORMAL";

      try {
        const classifyResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a message classifier for a Christian counseling ministry. Classify the user's message into exactly one category. Respond with ONLY the category word, nothing else.

CRISIS — User expresses suicidal thoughts, self-harm intent, desire to die, feeling like a burden, hopelessness about living, or any imminent danger to self or others. Also includes abuse situations where someone is in immediate danger. Examples: "saya ingin mengakhiri hidup", "sudah tidak kuat lagi", "lebih baik saya mati", "I want to end it all", "nobody would miss me".

HUMAN — User explicitly or implicitly requests to speak with a real person, counselor, pastor, or human agent. Or expresses frustration with automated responses. Examples: "bisa bicara dengan konselor?", "saya mau ngobrol sama orang beneran", "bukan bot", "can I talk to someone", "I need real help not a chatbot".

NORMAL — Everything else. General questions, prayer requests, sharing problems, asking for advice, greetings, etc.

Important: When in doubt between NORMAL and CRISIS, choose CRISIS. When in doubt between NORMAL and HUMAN, choose NORMAL.`
              },
              { role: "user", content: message.content ?? "" },
            ],
            max_tokens: 10,
            temperature: 0,
          }),
        });
        const classifyResult: any = await classifyResponse.json();
        const raw = (classifyResult.choices?.[0]?.message?.content ?? "NORMAL").trim().toUpperCase();
        if (raw.includes("CRISIS")) classification = "CRISIS";
        else if (raw.includes("HUMAN")) classification = "HUMAN";
        else classification = "NORMAL";
        logger.info(`[onRespondentMessage] Semantic classification: ${classification}`);
      } catch (classErr) {
        logger.error("[onRespondentMessage] Classification failed, defaulting to NORMAL:", classErr);
      }

      // Belt-and-suspenders: keyword triggers as fallback
      const triggers = aiConfig.escalationTriggers ?? [];
      let keywordTrigger: string | null = null;
      for (const trigger of triggers) {
        if (!trigger.enabled) continue;
        for (const kw of (trigger.keywords ?? []) as string[]) {
          if (messageContent.includes(kw.toLowerCase())) { keywordTrigger = trigger.reason; break; }
        }
        if (keywordTrigger) break;
      }
      if (keywordTrigger && classification === "NORMAL") {
        classification = "HUMAN";
        logger.info(`[onRespondentMessage] Keyword trigger "${keywordTrigger}" upgraded classification to HUMAN`);
      }

      // ── CRISIS — urgent handover + emergency alert ──
      if (classification === "CRISIS") {
        logger.warn(`[onRespondentMessage] CRISIS DETECTED in ticket ${ticketId}`);
        await db.doc(`tickets/${ticketId}`).update({
          handledBy: "escalated", aiHandoffStatus: "awaiting_human",
          escalation: keywordTrigger ?? "Crisis detected — possible self-harm or danger",
          priority: "urgent", updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const crisisReply = aiConfig.crisisReplyMessage
          ?? "Terima kasih sudah mau berbagi. Kami sangat peduli dengan keadaanmu. Seorang konselor kami akan segera menghubungimu secara pribadi. Kamu tidak sendirian. 🙏";
        await db.collection(`tickets/${ticketId}/messages`).add({
          senderId: "ai_assistant", senderName: "AI Assistant", senderRole: "ai",
          content: crisisReply, isInternal: false, aiGenerated: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await db.collection(`tickets/${ticketId}/messages`).add({
          senderId: "system", senderName: "System", senderRole: "system",
          content: `🚨 CRISIS DETECTED — Semantic analysis flagged possible self-harm or danger. Message: "${messageContent.substring(0, 300)}". IMMEDIATE human attention required.`,
          isInternal: true, createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        try { await db.doc(`organizations/${orgId}`).update({ "channelConfig.last_ai_reply": crisisReply }); } catch (e) { /* */ }
        // Emergency notification
        try {
          const orgData = orgDoc.data();
          const emergencyContacts = orgData?.emergencyContacts ?? [];
          const fonnteToken = orgData?.channelConfig?.fonnte_token ?? "";
          if (fonnteToken && emergencyContacts.length > 0) {
            const respondentDoc = await db.doc(`respondents/${ticket.respondentId}`).get();
            const respondentName = respondentDoc.exists ? (respondentDoc.data()?.displayName ?? respondentDoc.data()?.fullName ?? "Unknown") : "Unknown";
            const alertMsg = `🚨 *CRISIS ALERT*\n\nRespondent: *${respondentName}*\nTicket: *${ticket.ticketNumber ?? ticketId}*\nMessage: "${messageContent.substring(0, 200)}"\n\n⚡ IMMEDIATE ACTION REQUIRED — possible self-harm.\n🔗 https://outreachcbn.com/dashboard/tickets/${ticketId}`;
            for (const contact of emergencyContacts) {
              const ph = String(contact.phone ?? "").replace(/\D/g, "");
              if (!ph) continue;
              try {
                await fetch("https://api.fonnte.com/send", {
                  method: "POST", headers: { "Authorization": fonnteToken, "Content-Type": "application/json" },
                  body: JSON.stringify({ target: ph, message: alertMsg }),
                });
                logger.info(`[onRespondentMessage] Crisis alert sent to ${contact.name}`);
              } catch (e) { /* best effort */ }
            }
          }
        } catch (e) { logger.error("[onRespondentMessage] Crisis alert error:", e); }
        return;
      }

      // ── HUMAN — handover to human agent ──
      if (classification === "HUMAN") {
        logger.info(`[onRespondentMessage] Human handover requested for ticket ${ticketId}`);
        await db.doc(`tickets/${ticketId}`).update({
          handledBy: "escalated", aiHandoffStatus: "awaiting_human",
          escalation: keywordTrigger ?? "User requested human agent",
          priority: "high", updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const handoverReply = aiConfig.escalationReplyMessage
          ?? "Tentu, saya akan menghubungkan kamu dengan konselor kami. Seseorang akan segera menghubungimu. Terima kasih atas kesabarannya! 🙏";
        await db.collection(`tickets/${ticketId}/messages`).add({
          senderId: "ai_assistant", senderName: "AI Assistant", senderRole: "ai",
          content: handoverReply, isInternal: false, aiGenerated: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await db.collection(`tickets/${ticketId}/messages`).add({
          senderId: "system", senderName: "System", senderRole: "system",
          content: `🤖→👤 Auto-handover: User requested human agent. AI stopped replying.`,
          isInternal: true, createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        try { await db.doc(`organizations/${orgId}`).update({ "channelConfig.last_ai_reply": handoverReply }); } catch (e) { /* */ }
        return;
      }

      // ── NORMAL — proceed with AI reply ──
      const provider = aiConfig.provider ?? "openai";
      const model = aiConfig.model ?? "gpt-4o-mini";
      const systemPrompt = aiConfig.systemPrompt ?? "You are a helpful assistant.";

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

      // ── AI self-flag handoff via [HANDOFF: reason] tag ──
      const handoffMatch = aiReply.match(/\[HANDOFF:\s*(.+?)\]/i);
      if (handoffMatch) {
        const handoffReason = handoffMatch[1].trim();
        aiReply = aiReply.replace(/\[HANDOFF:\s*.+?\]/gi, "").trim();
        logger.info(`[onRespondentMessage] AI self-flagged handoff: ${handoffReason}`);
        await db.collection(`tickets/${ticketId}/messages`).add({
          senderId: "ai_assistant", senderName: "AI Assistant", senderRole: "ai",
          content: aiReply, isInternal: false, aiGenerated: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await db.doc(`tickets/${ticketId}`).update({
          handledBy: "escalated", aiHandoffStatus: "awaiting_human",
          escalation: `AI handoff: ${handoffReason}`, priority: "high",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await db.collection(`tickets/${ticketId}/messages`).add({
          senderId: "system", senderName: "System", senderRole: "system",
          content: `🤖→👤 AI requested human handoff: ${handoffReason}`,
          isInternal: true, createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        try { await db.doc(`organizations/${orgId}`).update({ "channelConfig.last_ai_reply": aiReply }); } catch (e) { /* */ }
        return;
      }

      // Save normal AI reply
      await db.collection(`tickets/${ticketId}/messages`).add({
        senderId: "ai_assistant", senderName: "AI Assistant", senderRole: "ai",
        content: aiReply.trim(), isInternal: false, aiGenerated: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await db.doc(`tickets/${ticketId}`).update({
        handledBy: "ai", updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      try { await db.doc(`organizations/${orgId}`).update({ "channelConfig.last_ai_reply": aiReply.trim() }); } catch (e) { /* */ }
      logger.info(`[onRespondentMessage] AI replied to ticket ${ticketId}`);

      // Data extraction
      try {
        const respondentMessagesCount = history.filter((m) => m.role === "user").length;
        if (respondentMessagesCount >= 2 && respondentMessagesCount % 2 === 0) {
          await extractRespondentData(ticketId, ticket.respondentId, history, apiKey, model);
        }
      } catch (extractErr) { logger.error("[onRespondentMessage] Data extraction failed:", extractErr); }

    } catch (err) {
      logger.error("[onRespondentMessage] Error:", err);
    }
  }
);

// ────────────────────────────────────────────────────────────────────────────
// Extract respondent data from conversation using AI
// ────────────────────────────────────────────────────────────────────────────
async function extractRespondentData(
  ticketId: string, respondentId: string,
  history: Array<{ role: string; content: string }>,
  apiKey: string, model: string
): Promise<void> {
  const db = getDb();
  const respondentDoc = await db.doc(`respondents/${respondentId}`).get();
  if (!respondentDoc.exists) return;
  const respondent = respondentDoc.data()!;

  const needsExtraction = {
    fullName: !respondent.fullName || respondent.fullName.startsWith("+") || respondent.fullName.startsWith("Facebook User") || respondent.fullName.startsWith("WhatsApp User"),
    city: !respondent.city, age: !respondent.age, programSource: !respondent.programSource,
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
IMPORTANT: Return ONLY the JSON object, no markdown, no explanation. Use null for fields not clearly mentioned. For names, only extract if user clearly states their name. For age, extract numbers only.

Conversation:
${conversationText}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model, messages: [
          { role: "system", content: "You are a data extraction assistant. Return only valid JSON." },
          { role: "user", content: extractionPrompt },
        ], max_tokens: 300, temperature: 0.1, response_format: { type: "json_object" },
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
    if (needsExtraction.fullName && extracted.fullName && typeof extracted.fullName === "string" && extracted.fullName.trim().length > 0) { updates.fullName = extracted.fullName.trim(); updatedFields.push("name"); }
    if (needsExtraction.city && extracted.city && typeof extracted.city === "string" && extracted.city.trim().length > 0) { updates.city = extracted.city.trim(); updatedFields.push("city"); }
    if (needsExtraction.age && extracted.age && typeof extracted.age === "number" && extracted.age > 0 && extracted.age < 120) { updates.age = extracted.age; updatedFields.push("age"); }
    if (needsExtraction.programSource && extracted.programSource && typeof extracted.programSource === "string" && extracted.programSource.trim().length > 0) { updates.programSource = extracted.programSource.trim(); updatedFields.push("source"); }
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
  } catch (err) { logger.error("[extractRespondentData] Extraction failed:", err); }
}