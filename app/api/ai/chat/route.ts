import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getDb() {
  if (!getApps().length) {
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "reachthesoul-prod",
    });
  }
  return getFirestore();
}

// Fetch AI config from organization document
async function getAIConfig(orgId: string) {
  try {
    const db = getDb();
    const doc = await db.collection("organizations").doc(orgId).get();
    if (!doc.exists) return null;
    return doc.data()?.aiConfig ?? null;
  } catch {
    return null;
  }
}

async function callOpenAI(apiKey: string, model: string, messages: any[]) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 1000, temperature: 0.7 }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(apiKey: string, model: string, messages: any[]) {
  const systemMsg = messages.find((m: any) => m.role === "system");
  const conversationMsgs = messages.filter((m: any) => m.role !== "system");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      system: systemMsg?.content ?? "",
      messages: conversationMsgs,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const { messages, orgId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    // Load org-specific AI config
    let config: any = null;
    if (orgId) {
      try {
        config = await getAIConfig(orgId);
      } catch {
        // Fall back to env vars
      }
    }

    const provider = config?.provider ?? process.env.AI_PROVIDER ?? "";
    // Org BYOK (Bring Your Own Key) or platform key
    const apiKey = config?.apiKey ?? process.env.AI_API_KEY ?? "";
    const model = config?.model ?? process.env.AI_MODEL ?? "";

    if (!provider || !apiKey) {
      return NextResponse.json(
        {
          error:
            "AI not configured. Go to Admin → AI Settings to set up API key.",
        },
        { status: 503 }
      );
    }

    let reply = "";

    if (provider === "openai") {
      reply = await callOpenAI(apiKey, model || "gpt-4o-mini", messages);
    } else if (provider === "anthropic") {
      reply = await callAnthropic(
        apiKey,
        model || "claude-sonnet-4-20250514",
        messages
      );
    } else {
      return NextResponse.json(
        { error: `Unknown provider: ${provider}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      choices: [{ message: { content: reply } }],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[AI Chat API]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
