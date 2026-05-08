import type { EscalationReason, EscalationTrigger, AIConfig, Message } from "@/types";

// ─── Internal route handler (keeps credentials server-side) ─────────────────
const AI_ENDPOINT = "/api/ai/chat";

// ─── Escalation trigger detection ───────────────────────────────────────────
export function detectEscalation(
  text: string,
  config: AIConfig
): EscalationTrigger | null {
  const lower = text.toLowerCase();

  for (const trigger of config.escalationTriggers) {
    if (!trigger.enabled) continue;
    const matched = trigger.keywords.filter((kw) => lower.includes(kw.toLowerCase()));
    if (matched.length > 0) {
      const confidence = Math.min(0.6 + matched.length * 0.15, 0.99);
      return {
        reason:            trigger.reason as EscalationReason,
        label:             trigger.label,
        detectedKeywords:  matched,
        confidence,
      };
    }
  }
  return null;
}

// ─── Build conversation history for the API ─────────────────────────────────
function buildHistory(messages: Message[], systemPrompt: string) {
  const history: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of messages) {
    if (msg.senderRole === "system") continue;
    if (msg.isInternal) continue; // don't include internal notes
    if (msg.senderRole === "ai") {
      history.push({ role: "assistant", content: msg.content });
    } else if (msg.senderRole === "agent") {
      history.push({ role: "assistant", content: msg.content });
    } else {
      // respondent messages would go here in production
      // for now map any non-agent as user
    }
  }

  return history;
}

// ─── Generate AI reply ───────────────────────────────────────────────────────
export async function generateAIReply(
  incomingMessage: string,
  conversationHistory: Message[],
  config: AIConfig,
  respondentName?: string
): Promise<{ reply: string; escalation: EscalationTrigger | null }> {
  // Always check for escalation first, regardless of AI reply
  const escalation = detectEscalation(incomingMessage, config);

  const systemPrompt = config.systemPrompt +
    (respondentName ? `\n\nYou are speaking with ${respondentName}. Address them by name.` : "");

  const history = buildHistory(conversationHistory, systemPrompt);

  // Add the new incoming message
  history.push({ role: "user", content: incomingMessage });

  const response = await fetch(AI_ENDPOINT, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ messages: history }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content ?? "";

  return { reply, escalation };
}

// ─── Simulate AI processing delay (for UX — typing indicator) ───────────────
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Escalation reason labels ────────────────────────────────────────────────
export const ESCALATION_LABELS: Record<EscalationReason, string> = {
  prayer_request:    "Prayer Request",
  counseling:        "Counseling / Emotional Support",
  salvation_inquiry: "Wants to Know Jesus",
  grief_or_crisis:   "Grief / Crisis",
  baptism_request:   "Baptism Request",
  manual_escalation: "Manually Escalated",
};

export const ESCALATION_COLORS: Record<EscalationReason, string> = {
  prayer_request:    "bg-violet-50 border-violet-200 text-violet-800",
  counseling:        "bg-red-50 border-red-200 text-red-800",
  salvation_inquiry: "bg-amber-50 border-amber-200 text-amber-800",
  grief_or_crisis:   "bg-red-100 border-red-300 text-red-900",
  baptism_request:   "bg-blue-50 border-blue-200 text-blue-800",
  manual_escalation: "bg-orange-50 border-orange-200 text-orange-800",
};

export const ESCALATION_ICONS: Record<EscalationReason, string> = {
  prayer_request:    "Hands",
  counseling:        "HeartHandshake",
  salvation_inquiry: "Cross",
  grief_or_crisis:   "AlertTriangle",
  baptism_request:   "Droplets",
  manual_escalation: "UserCog",
};
