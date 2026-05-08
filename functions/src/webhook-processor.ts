import * as admin from "firebase-admin";
import { FieldValue, Firestore } from "firebase-admin/firestore";

// Lazy init — do NOT call initializeApp() or firestore() at the module top level.
function getApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!;
  return admin.initializeApp();
}

function getDb(): Firestore {
  return getApp().firestore();
}

export type Channel = "whatsapp_meta" | "whatsapp_fonnte" | "instagram" | "facebook" | "call";

export type AttachmentType = "image" | "video" | "audio" | "document" | "sticker" | "other";

export type Attachment = {
  type: AttachmentType;
  url: string;          // Permanent Firebase Storage URL (after upload)
  originalUrl?: string; // Original URL from channel (for fallback/audit)
  mimeType?: string;
  filename?: string;
  size?: number;        // bytes
  caption?: string;     // text caption that came with media
};

export type IncomingMessage = {
  channel: Channel;
  senderId: string;       // phone number or platform user ID
  senderName: string;     // display name from platform
  senderPhone?: string;   // normalized E.164 phone (WhatsApp / Call)
  message: string;        // message body (or caption if media-only)
  attachments?: Attachment[]; // optional media attachments
  rawPayload: object;     // original payload stored for audit
};

const CHANNEL_LEAD_SOURCE: Record<Channel, string> = {
  whatsapp_meta:   "WhatsApp",
  whatsapp_fonnte: "WhatsApp",
  instagram:       "Instagram",
  facebook:        "Facebook",
  call:            "Telepon",
};

// ─── Helper: find or create lead source ──────────────────────────────────────
async function getLeadSourceId(name: string): Promise<string> {
  const db   = getDb();
  const snap = await db.collection("lead_sources")
    .where("name", "==", name).limit(1).get();

  if (!snap.empty) return snap.docs[0].id;

  const ref = await db.collection("lead_sources").add({
    name,
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

// ─── Helper: generate next ticket number ─────────────────────────────────────
async function nextTicketNumber(): Promise<string> {
  const db   = getDb();
  const snap = await db.collection("tickets").count().get();
  const n    = snap.data().count + 1;
  return `TKT-${String(n).padStart(5, "0")}`;
}

// ─── Helper: find active ticket within 24h session window ────────────────
async function findActiveTicket(respondentId: string): Promise<string | null> {
  const db = getDb();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  
  // Query all tickets for this respondent (simple single-field query, no composite index needed)
  const snap = await db.collection("tickets")
    .where("respondentId", "==", respondentId)
    .get();

  if (snap.empty) return null;

  const now = Date.now();
  
  // Find most recent open/in_progress ticket within 24h session
  let bestTicket: { id: string; updatedAt: number } | null = null;

  for (const doc of snap.docs) {
    const data = doc.data();
    const status = data.status;
    
    // Only consider open or in_progress tickets
    if (status !== "open" && status !== "in_progress") continue;

    // Get last activity time (updatedAt or createdAt)
    const updatedAt = data.updatedAt?.toMillis?.() ?? ((data.updatedAt?._seconds ?? 0) * 1000);
    const createdAt = data.createdAt?.toMillis?.() ?? ((data.createdAt?._seconds ?? 0) * 1000);
    const lastActivity = Math.max(updatedAt, createdAt);

    // Check 24h session window
    if (now - lastActivity > TWENTY_FOUR_HOURS) continue;

    // Pick the most recently updated one
    if (!bestTicket || lastActivity > bestTicket.updatedAt) {
      bestTicket = { id: doc.id, updatedAt: lastActivity };
    }
  }

  return bestTicket?.id ?? null;
}

// ─── Main: upsert respondent → find or create ticket → add message ───────────
export async function processIncomingMessage(data: IncomingMessage) {
  const db = getDb();

  // 1. Upsert respondent by (channel, senderId) pair
  const respondentsRef = db.collection("respondents");
  const existing = await respondentsRef
    .where("channelSenderId", "==", data.senderId)
    .where("channel", "==", data.channel)
    .limit(1).get();

  let respondentId: string;
  let respondentName: string = data.senderName;

  if (!existing.empty) {
    respondentId = existing.docs[0].id;
    respondentName = existing.docs[0].data().fullName ?? data.senderName;
    await respondentsRef.doc(respondentId).update({
      fullName:  data.senderName,
      ...(data.senderPhone ? { phone: data.senderPhone } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    const leadSourceId = await getLeadSourceId(CHANNEL_LEAD_SOURCE[data.channel]);
    const newRef = respondentsRef.doc();
    respondentId = newRef.id;
    await newRef.set({
      respondentId:    newRef.id,
      fullName:        data.senderName,
      phone:           data.senderPhone ?? null,
      channel:         data.channel,
      channelSenderId: data.senderId,
      leadSourceId,
      isArchived:      false,
      notes:           null,
      createdAt:       FieldValue.serverTimestamp(),
      updatedAt:       FieldValue.serverTimestamp(),
    });
  }

  // 2. Find active ticket within 24h session OR create new one
  let ticketId = await findActiveTicket(respondentId);
  let ticketNumber: string;

  // Helper for last message preview (handle media-only messages)
  const previewText = (() => {
    if (data.message && data.message.trim().length > 0) {
      return data.message.length > 100 ? data.message.substring(0, 100) + "..." : data.message;
    }
    if (data.attachments && data.attachments.length > 0) {
      const first = data.attachments[0];
      const icons: Record<string, string> = {
        image: "📷 Photo",
        video: "🎥 Video",
        audio: "🎵 Voice message",
        document: "📄 Document",
        sticker: "🎨 Sticker",
        other: "📎 Attachment",
      };
      return icons[first.type] ?? "📎 Attachment";
    }
    return "(empty)";
  })();

  if (ticketId) {
    // Existing ticket found — add message to it
    const ticketDoc = await db.doc(`tickets/${ticketId}`).get();
    ticketNumber = ticketDoc.data()?.ticketNumber ?? "—";

    // Update ticket with last message info + timestamp
    await db.doc(`tickets/${ticketId}`).update({
      lastMessage:       previewText,
      lastMessageAt:     FieldValue.serverTimestamp(),
      lastMessageSender: data.senderName,
      hasUnread:         true,
      updatedAt:         FieldValue.serverTimestamp(),
    });
  } else {
    // No open ticket — create new one
    ticketNumber = await nextTicketNumber();
    const subject = previewText.length > 80 ? previewText.substring(0, 80) + "..." : previewText;

    const ticketRef = db.collection("tickets").doc();
    ticketId = ticketRef.id;
    await ticketRef.set({
      ticketId:            ticketRef.id,
      ticketNumber,
      respondentId,
      respondentName,
      subject,
      channel:             data.channel,
      status:              "open",
      priority:            "medium",
      assignedAgentId:     null,
      assignedAgentName:   null,
      categoryId:          null,
      categoryName:        null,
      interactionOutcomeId:null,
      lastMessage:         previewText,
      lastMessageAt:       FieldValue.serverTimestamp(),
      lastMessageSender:   data.senderName,
      hasUnread:           true,
      rawPayload:          data.rawPayload,
      createdAt:           FieldValue.serverTimestamp(),
      updatedAt:           FieldValue.serverTimestamp(),
    });
  }

  // 3. Add message to ticket subcollection
  const messageData: Record<string, any> = {
    senderId:   data.senderId,
    senderName: data.senderName,
    senderRole: "respondent",
    channel:    data.channel,
    content:    data.message,
    isInternal: false,
    createdAt:  FieldValue.serverTimestamp(),
  };
  if (data.attachments && data.attachments.length > 0) {
    messageData.attachments = data.attachments;
    messageData.hasAttachments = true;
  }
  await db.collection(`tickets/${ticketId}/messages`).add(messageData);

  return { respondentId, ticketId, ticketNumber };
}