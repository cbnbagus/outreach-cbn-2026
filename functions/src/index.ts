import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { setGlobalOptions, logger } from "firebase-functions/v2";
import { processIncomingMessage } from "./webhook-processor";
import { downloadAndUploadMedia, categorizeMimeType } from "./media-helper";
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
// Helper: get channel config from organization document (multi-tenant)
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
// OUTBOUND REPLY TRIGGER
// When an agent sends a message, auto-send it to the respondent
// via the original channel. Config read from organizations/{orgId}.channelConfig
// ────────────────────────────────────────────────────────────────────────────
export const onMessageCreated = onDocumentCreated(
  "tickets/{ticketId}/messages/{messageId}",
  async (event) => {
    const message = event.data?.data();
    if (!message) return;

    // Send outbound for staff messages (agent/admin/supervisor) AND AI messages, NOT internal
    const outboundRoles = ["agent", "admin", "supervisor", "ai"];
    if (!outboundRoles.includes(message.senderRole) || message.isInternal) {
      return;
    }

    const ticketId = event.params.ticketId;
    const db = getDb();

    try {
      // Get ticket
      const ticketDoc = await db.doc(`tickets/${ticketId}`).get();
      if (!ticketDoc.exists) {
        logger.error("[onMessageCreated] Ticket not found:", ticketId);
        return;
      }
      const ticket = ticketDoc.data()!;
      const channel = ticket.channel ?? "";
      const orgId = ticket.orgId ?? "";

      // Get respondent
      const respondentDoc = await db.doc(`respondents/${ticket.respondentId}`).get();
      if (!respondentDoc.exists) {
        logger.error("[onMessageCreated] Respondent not found:", ticket.respondentId);
        return;
      }
      const respondent = respondentDoc.data()!;
      const phone = respondent.phone ?? respondent.channelSenderId ?? "";

      if (!phone) {
        logger.warn("[onMessageCreated] No phone number for respondent");
        return;
      }

      // Get channel config from organization document (multi-tenant)
      const config = await getChannelConfig(orgId);

      // ── Send via Fonnte (WhatsApp) ──
      if (channel === "whatsapp_fonnte" || channel === "manual" ||
          config.active_whatsapp_provider === "fonnte") {
        const token = config.fonnte_token ?? "";
        if (!token) {
          logger.warn("[onMessageCreated] Fonnte token not configured in system_config/channel_settings");
          return;
        }

        const cleanPhone = phone.replace(/^\+/, "");

        const response = await fetch("https://api.fonnte.com/send", {
          method: "POST",
          headers: {
            "Authorization": token,
          },
          body: new URLSearchParams({
            target: cleanPhone,
            message: message.content,
            type: "text",
          }),
        });

        const result = await response.json();
        logger.info(`[onMessageCreated] Fonnte → ${cleanPhone}:`, JSON.stringify(result));
      }

      // ── Send via Meta WhatsApp Cloud API ──
      else if (channel === "whatsapp_meta" ||
               config.active_whatsapp_provider === "meta") {
        const waToken = config.whatsapp_access_token ?? "";
        const waPhoneId = config.whatsapp_phone_number_id ?? "";
        if (!waToken || !waPhoneId) {
          logger.warn("[onMessageCreated] Meta WhatsApp credentials not configured in system_config/channel_settings");
          return;
        }

        const cleanPhone = phone.replace(/^\+/, "");

        const response = await fetch(
          `https://graph.facebook.com/v18.0/${waPhoneId}/messages`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${waToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: cleanPhone,
              type: "text",
              text: { body: message.content },
            }),
          }
        );

        const result = await response.json();
        logger.info(`[onMessageCreated] Meta WA → ${cleanPhone}:`, JSON.stringify(result));
      }

      // ── Facebook Messenger ──
      else if (channel === "facebook") {
        const fbToken = config.facebook_page_access_token ?? "";
        if (!fbToken) {
          logger.warn("[onMessageCreated] Facebook page token not configured in system_config/channel_settings");
          return;
        }

        // Use channelSenderId (PSID — Page-Scoped User ID)
        const recipientId = respondent.channelSenderId ?? "";
        if (!recipientId) {
          logger.warn("[onMessageCreated] No channelSenderId for Facebook recipient");
          return;
        }

        const response = await fetch(
          `https://graph.facebook.com/v18.0/me/messages?access_token=${fbToken}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipient: { id: recipientId },
              message: { text: message.content },
              messaging_type: "RESPONSE",
            }),
          }
        );

        const result = await response.json();
        logger.info(`[onMessageCreated] FB Messenger → ${recipientId}:`, JSON.stringify(result));
      }

      // ── Instagram DM ──
      else if (channel === "instagram") {
        const igToken = config.instagram_access_token ?? config.facebook_page_access_token ?? "";
        if (!igToken) {
          logger.warn("[onMessageCreated] Instagram token not configured");
          return;
        }

        const recipientId = respondent.channelSenderId ?? "";
        if (!recipientId) {
          logger.warn("[onMessageCreated] No channelSenderId for Instagram recipient");
          return;
        }

        const response = await fetch(
          `https://graph.facebook.com/v18.0/me/messages?access_token=${igToken}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipient: { id: recipientId },
              message: { text: message.content },
            }),
          }
        );

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
  const WA_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "oms_wa_token";

  if (req.method === "GET") {
    const mode      = req.query["hub.mode"];
    const token     = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === WA_VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.status(403).json({ error: "Forbidden" });
    }
    return;
  }

  if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

  // Extract org from query param: ?org=orgId
  const orgId = req.query.org as string;
  if (!orgId) {
    res.status(400).json({ error: "Missing org parameter" });
    return;
  }

  try {
    const body  = req.body;
    const value = body?.entry?.[0]?.changes?.[0]?.value;

    if (value?.messages?.length) {
      for (const msg of value.messages as any[]) {
        if (msg.type !== "text") continue;
        const contact = (value.contacts as any[])?.find((c: any) => c.wa_id === msg.from);
        const phone   = `+${msg.from}`;
        await processIncomingMessage({
          orgId,
          channel:     "whatsapp_meta",
          senderId:    msg.from,
          senderName:  contact?.profile?.name ?? phone,
          senderPhone: phone,
          message:     msg.text?.body ?? "(pesan kosong)",
          rawPayload:  body,
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
// ────────────────────────────────────────────────────────────────────────────
export const webhookFonnte = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

  const orgId = req.query.org as string;
  if (!orgId) { res.status(400).json({ error: "Missing org parameter" }); return; }

  try {
    const body    = req.body;
    const phone   = String(body.sender ?? "").startsWith("+")
      ? body.sender : `+${body.sender}`;
    const name    = String(body.name ?? phone);
    const message = String(body.message ?? "");

    // Skip echo messages (sent by us via Fonnte API, echoed back)
    const isEcho = body.fromMe === true || body.from_me === true ||
                   message.includes("_Sent via fonnte.com_") ||
                   message.includes("Sent via fonnte");
    if (isEcho) {
      res.status(200).json({ status: "ok", skipped: "echo" });
      return;
    }

    // Parse attachments from Fonnte
    // Fonnte sends media URL in `url` field, type in `type` field
    // type can be: image, video, audio, document, sticker, location, etc.
    const attachments = await parseFonnteAttachments(body);

    await processIncomingMessage({
      orgId,
      channel:     "whatsapp_fonnte",
      senderId:    String(body.sender ?? ""),
      senderName:  name,
      senderPhone: phone,
      message:     message || "",
      attachments: attachments.length > 0 ? attachments : undefined,
      rawPayload:  body,
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

  // Fonnte sends media URL in body.url
  const mediaUrl = body.url ?? body.media ?? body.file;
  const mediaType = (body.type ?? "").toLowerCase();

  if (mediaUrl && mediaType && mediaType !== "text") {
    // Generate temporary IDs for storage path (will be reorganized later if needed)
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
// ────────────────────────────────────────────────────────────────────────────
export const webhookInstagram = onRequest({ cors: true }, async (req, res) => {
  const IG_VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN ?? "oms_ig_token";

  if (req.method === "GET") {
    const mode      = req.query["hub.mode"];
    const token     = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === IG_VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.status(403).json({ error: "Forbidden" });
    }
    return;
  }

  if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

  const orgId = req.query.org as string;
  if (!orgId) { res.status(400).json({ error: "Missing org parameter" }); return; }

  try {
    const body = req.body;
    const messaging = body?.entry?.[0]?.messaging ?? [];

    for (const event of messaging as any[]) {
      if (!event.message?.text) continue;
      const senderId = String(event.sender?.id ?? "");
      await processIncomingMessage({
        orgId,
        channel:    "instagram",
        senderId,
        senderName: `Instagram User ${senderId.slice(-4)}`,
        message:    event.message.text,
        rawPayload: body,
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
// ────────────────────────────────────────────────────────────────────────────
export const webhookFacebook = onRequest({ cors: true }, async (req, res) => {
  const FB_VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN ?? "oms_fb_token";

  if (req.method === "GET") {
    const mode      = req.query["hub.mode"];
    const token     = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === FB_VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.status(403).json({ error: "Forbidden" });
    }
    return;
  }

  if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

  const orgId = req.query.org as string;
  if (!orgId) { res.status(400).json({ error: "Missing org parameter" }); return; }

  try {
    const body = req.body;
    const messaging = body?.entry?.[0]?.messaging ?? [];

    for (const event of messaging as any[]) {
      if (!event.message?.text) continue;
      const senderId = String(event.sender?.id ?? "");
      await processIncomingMessage({
        orgId,
        channel:    "facebook",
        senderId,
        senderName: `Facebook User ${senderId.slice(-4)}`,
        message:    event.message.text,
        rawPayload: body,
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
    const body    = req.body;
    const phone   = String(body.phone ?? "").trim();
    if (!phone) { res.status(400).json({ error: "phone is required" }); return; }

    const name    = String(body.name ?? phone);
    const message = String(body.subject ?? body.notes ?? "Inbound call");

    await processIncomingMessage({
      channel:     "call",
      senderId:    phone,
      senderName:  name,
      senderPhone: phone,
      message,
      rawPayload:  body,
    });
    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("[webhookCall]", err);
    res.status(500).json({ error: "Internal error" });
  }
});
// ────────────────────────────────────────────────────────────────────────────
// AI AUTO-REPLY TRIGGER
// When a respondent sends a message, AI handles it (if enabled for channel).
// Detects escalation triggers → hands off to human agent.
//
// Config read from Firestore: system_config/ai_settings
// ────────────────────────────────────────────────────────────────────────────
export const onRespondentMessage = onDocumentCreated(
  {
    document: "tickets/{ticketId}/messages/{messageId}",
    timeoutSeconds: 60,
  },
  async (event) => {
    const message = event.data?.data();
    if (!message) return;

    // Only process respondent messages (not agent/AI/system)
    if (message.senderRole !== "respondent" || message.isInternal) return;

    const ticketId = event.params.ticketId;
    const db = getDb();

    try {
      // Get ticket to check if AI should handle it
      const ticketDoc = await db.doc(`tickets/${ticketId}`).get();
      if (!ticketDoc.exists) return;
      const ticket = ticketDoc.data()!;

      // Skip if ticket is already handled by human or escalated
      if (ticket.handledBy === "human" || ticket.handledBy === "escalated") {
        logger.info(`[onRespondentMessage] Ticket ${ticketId} is ${ticket.handledBy}, skipping AI`);
        return;
      }

      // Load AI settings
      const aiDoc = await db.doc("system_config/ai_settings").get();
      if (!aiDoc.exists) {
        logger.info("[onRespondentMessage] No AI settings configured");
        return;
      }
      const aiConfig = aiDoc.data()!;

      // Check if AI is enabled globally
      if (!aiConfig.enabled || !aiConfig.autoReply) {
        logger.info("[onRespondentMessage] AI disabled or autoReply off");
        return;
      }

      // Idempotency: skip if this message already has an AI reply after it
      const messageId = event.params.messageId;
      const messageCreatedAt = message.createdAt?.toMillis?.() ?? Date.now();
      const laterMessages = await db.collection(`tickets/${ticketId}/messages`)
        .where("createdAt", ">", new Date(messageCreatedAt))
        .limit(5)
        .get();
      const alreadyReplied = laterMessages.docs.some((d) => {
        const data = d.data();
        return data.senderRole === "ai" && data.aiGenerated === true;
      });
      if (alreadyReplied) {
        logger.info(`[onRespondentMessage] Already replied to ${messageId}, skipping duplicate`);
        return;
      }

      // Check if AI is enabled for this channel
      const channel = ticket.channel ?? "";
      const channelToggles = aiConfig.channelToggles ?? {};
      // Map Firestore channel names to settings keys (PascalCase)
      const channelKey =
        channel === "whatsapp_fonnte" || channel === "whatsapp_meta" ? "WhatsApp" :
        channel === "facebook" ? "Facebook" :
        channel === "instagram" ? "Instagram" :
        channel === "call" ? "Call" :
        channel;
      if (channelToggles[channelKey] === false) {
        logger.info(`[onRespondentMessage] AI disabled for channel ${channelKey}`);
        return;
      }

      // ── Check escalation triggers (keyword-based) ──
      const messageContent = (message.content ?? "").toLowerCase();
      const triggers = aiConfig.escalationTriggers ?? [];
      let detectedTrigger: string | null = null;

      for (const trigger of triggers) {
        if (!trigger.enabled) continue;
        const keywords = (trigger.keywords ?? []) as string[];
        for (const kw of keywords) {
          if (messageContent.includes(kw.toLowerCase())) {
            detectedTrigger = trigger.reason;
            break;
          }
        }
        if (detectedTrigger) break;
      }

      if (detectedTrigger) {
        logger.info(`[onRespondentMessage] Escalation detected: ${detectedTrigger}`);
        // Mark ticket as escalated, stop AI handling
        await db.doc(`tickets/${ticketId}`).update({
          handledBy: "escalated",
          escalation: detectedTrigger,
          priority: "high",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Add system message notifying escalation
        await db.collection(`tickets/${ticketId}/messages`).add({
          senderId: "system",
          senderName: "System",
          senderRole: "system",
          content: `⚠️ Escalated to human agent (trigger: ${detectedTrigger})`,
          isInternal: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }

      // ── Call AI API ──
      const provider = aiConfig.provider ?? "openai";
      const apiKey = aiConfig.apiKey ?? "";
      const model = aiConfig.model ?? "gpt-4o-mini";
      const systemPrompt = aiConfig.systemPrompt ?? "You are a helpful assistant.";

      if (!apiKey) {
        logger.warn("[onRespondentMessage] No API key configured");
        return;
      }

      // Fetch last 10 messages for context
      const messagesSnap = await db.collection(`tickets/${ticketId}/messages`)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
      const history = messagesSnap.docs
        .reverse()
        .filter((d) => !d.data().isInternal)
        .map((d) => {
          const m = d.data();
          return {
            role: m.senderRole === "respondent" ? "user" : "assistant",
            content: m.content ?? "",
          };
        });

      let aiReply = "";

      if (provider === "openai") {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              ...history,
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
        });
        const result: any = await response.json();
        if (result.error) {
          logger.error("[onRespondentMessage] OpenAI error:", result.error);
          return;
        }
        aiReply = result.choices?.[0]?.message?.content ?? "";
      } else if (provider === "anthropic") {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            max_tokens: 500,
            system: systemPrompt,
            messages: history,
          }),
        });
        const result: any = await response.json();
        if (result.error) {
          logger.error("[onRespondentMessage] Anthropic error:", result.error);
          return;
        }
        aiReply = result.content?.[0]?.text ?? "";
      }

      if (!aiReply.trim()) {
        logger.warn("[onRespondentMessage] AI returned empty reply");
        return;
      }

      // ── Save AI reply as message (this will trigger onMessageCreated to send to channel) ──
      await db.collection(`tickets/${ticketId}/messages`).add({
        senderId: "ai_assistant",
        senderName: "AI Assistant",
        senderRole: "ai",
        content: aiReply.trim(),
        isInternal: false,
        aiGenerated: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Mark ticket as handled by AI
      await db.doc(`tickets/${ticketId}`).update({
        handledBy: "ai",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`[onRespondentMessage] AI replied to ticket ${ticketId}`);

      // ── DATA EXTRACTION — extract respondent info from conversation ──
      // Only run extraction every 2 respondent messages to save cost and improve accuracy
      try {
        const respondentMessagesCount = history.filter((m) => m.role === "user").length;
        if (respondentMessagesCount >= 2 && respondentMessagesCount % 2 === 0) {
          await extractRespondentData(ticketId, ticket.respondentId, history, apiKey, model);
        }
      } catch (extractErr) {
        logger.error("[onRespondentMessage] Data extraction failed:", extractErr);
        // Don't fail the whole function if extraction fails
      }
    } catch (err) {
      logger.error("[onRespondentMessage] Error:", err);
    }
  }
);

// ────────────────────────────────────────────────────────────────────────────
// Extract respondent data from conversation using AI
// Only updates fields that are currently empty/null
// ────────────────────────────────────────────────────────────────────────────
async function extractRespondentData(
  ticketId: string,
  respondentId: string,
  history: Array<{ role: string; content: string }>,
  apiKey: string,
  model: string
): Promise<void> {
  const db = getDb();

  // Get current respondent data
  const respondentDoc = await db.doc(`respondents/${respondentId}`).get();
  if (!respondentDoc.exists) return;
  const respondent = respondentDoc.data()!;

  // Only extract fields that are empty
  const needsExtraction = {
    fullName: !respondent.fullName || respondent.fullName.startsWith("+") || respondent.fullName.startsWith("Facebook User") || respondent.fullName.startsWith("WhatsApp User"),
    city: !respondent.city,
    age: !respondent.age,
    programSource: !respondent.programSource,
    problemCategories: !respondent.problemCategories || respondent.problemCategories.length === 0,
  };

  // If nothing to extract, skip
  if (!Object.values(needsExtraction).some((v) => v)) {
    logger.info(`[extractRespondentData] All fields already filled for ${respondentId}`);
    return;
  }

  // Build conversation text
  const conversationText = history
    .map((m) => `${m.role === "user" ? "User" : "Counselor"}: ${m.content}`)
    .join("\n");

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
- For names, only extract if user clearly states their name (not nicknames like "saya" or "aku")
- For age, extract numbers only (e.g., 25, not "dua puluh lima")
- For problemCategories, identify key issues the user is facing

Conversation:
${conversationText}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a data extraction assistant. Return only valid JSON." },
          { role: "user", content: extractionPrompt },
        ],
        max_tokens: 300,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    const result: any = await response.json();
    if (result.error) {
      logger.error("[extractRespondentData] OpenAI error:", result.error);
      return;
    }

    const extractedText = result.choices?.[0]?.message?.content ?? "{}";
    let extracted: any;
    try {
      extracted = JSON.parse(extractedText);
    } catch (parseErr) {
      logger.error("[extractRespondentData] Failed to parse JSON:", extractedText);
      return;
    }

    // Build update object — only update fields that are currently empty and have extracted value
    const updates: Record<string, any> = {};
    const updatedFields: string[] = [];

    if (needsExtraction.fullName && extracted.fullName && typeof extracted.fullName === "string" && extracted.fullName.trim().length > 0) {
      updates.fullName = extracted.fullName.trim();
      updatedFields.push("name");
    }
    if (needsExtraction.city && extracted.city && typeof extracted.city === "string" && extracted.city.trim().length > 0) {
      updates.city = extracted.city.trim();
      updatedFields.push("city");
    }
    if (needsExtraction.age && extracted.age && typeof extracted.age === "number" && extracted.age > 0 && extracted.age < 120) {
      updates.age = extracted.age;
      updatedFields.push("age");
    }
    if (needsExtraction.programSource && extracted.programSource && typeof extracted.programSource === "string" && extracted.programSource.trim().length > 0) {
      updates.programSource = extracted.programSource.trim();
      updatedFields.push("source");
    }
    if (needsExtraction.problemCategories && Array.isArray(extracted.problemCategories) && extracted.problemCategories.length > 0) {
      const validCategories = extracted.problemCategories.filter((c: any) => typeof c === "string" && c.trim().length > 0);
      if (validCategories.length > 0) {
        updates.problemCategories = validCategories;
        updatedFields.push("categories");
      }
    }

    // If we have updates, save them
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      await db.doc(`respondents/${respondentId}`).update(updates);

      // Add internal note to ticket for audit
      await db.collection(`tickets/${ticketId}/messages`).add({
        senderId: "system",
        senderName: "System",
        senderRole: "system",
        content: `🤖 Data extracted by AI: ${updatedFields.join(", ")}`,
        isInternal: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`[extractRespondentData] Updated ${respondentId}: ${updatedFields.join(", ")}`);
    } else {
      logger.info(`[extractRespondentData] Nothing new to extract for ${respondentId}`);
    }
  } catch (err) {
    logger.error("[extractRespondentData] Extraction failed:", err);
  }
}