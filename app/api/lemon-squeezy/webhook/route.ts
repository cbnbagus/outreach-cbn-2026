import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "";

// Variant ID → plan tier mapping
const VARIANT_TO_PLAN: Record<string, string> = {
  [process.env.LS_VARIANT_STARTER ?? "1662320"]: "starter",
  [process.env.LS_VARIANT_GROWTH ?? "1662333"]: "growth",
  [process.env.LS_VARIANT_ENTERPRISE ?? "1662339"]: "enterprise",
};

function verifySignature(rawBody: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false;
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  hmac.update(rawBody);
  const digest = hmac.digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

async function updateOrgPlan(orgId: string, plan: string, subscriptionData: any) {
  // Use Firebase Admin SDK via REST API (since we're in Next.js API route)
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID ?? "reachthesoul-prod",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
        privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      }),
    });
  }

  const db = getFirestore();
  await db.doc(`organizations/${orgId}`).update({
    plan,
    subscription: {
      provider: "lemonsqueezy",
      subscriptionId: subscriptionData.id,
      customerId: subscriptionData.attributes?.customer_id,
      variantId: subscriptionData.attributes?.variant_id,
      status: subscriptionData.attributes?.status,
      currentPeriodEnd: subscriptionData.attributes?.renews_at,
      cancelAtPeriodEnd: subscriptionData.attributes?.cancelled ?? false,
      updatedAt: new Date().toISOString(),
    },
    updatedAt: new Date(),
  });

  console.log(`[LS Webhook] Updated org ${orgId} to plan: ${plan}`);
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") ?? "";

    // Verify webhook signature
    if (WEBHOOK_SECRET && !verifySignature(rawBody, signature)) {
      console.error("[LS Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta?.event_name;
    const customData = payload.meta?.custom_data;
    const subscription = payload.data;

    console.log(`[LS Webhook] Event: ${eventName}, OrgId: ${customData?.org_id}`);

    if (!customData?.org_id) {
      console.warn("[LS Webhook] No org_id in custom data");
      return NextResponse.json({ status: "ok", skipped: "no org_id" });
    }

    const orgId = customData.org_id;
    const variantId = String(subscription?.attributes?.variant_id ?? "");
    const plan = VARIANT_TO_PLAN[variantId] ?? customData?.plan_tier ?? "free";
    const subscriptionStatus = subscription?.attributes?.status;

    switch (eventName) {
      case "subscription_created":
        // New subscription — upgrade plan
        await updateOrgPlan(orgId, plan, subscription);
        break;

      case "subscription_updated":
        // Subscription changed (upgrade/downgrade/resume)
        if (subscriptionStatus === "active" || subscriptionStatus === "on_trial") {
          await updateOrgPlan(orgId, plan, subscription);
        } else if (subscriptionStatus === "cancelled" || subscriptionStatus === "expired") {
          // Downgrade to free
          await updateOrgPlan(orgId, "free", subscription);
        } else if (subscriptionStatus === "paused" || subscriptionStatus === "past_due") {
          // Keep current plan but mark subscription status
          await updateOrgPlan(orgId, plan, subscription);
        }
        break;

      case "subscription_payment_success":
        // Payment received — ensure plan is active
        await updateOrgPlan(orgId, plan, subscription);
        break;

      case "subscription_payment_failed":
        // Payment failed — could downgrade or send warning
        console.warn(`[LS Webhook] Payment failed for org ${orgId}`);
        break;

      case "subscription_cancelled":
        // Will expire at period end — mark but don't downgrade yet
        await updateOrgPlan(orgId, plan, subscription);
        break;

      case "subscription_expired":
        // Subscription fully expired — downgrade to free
        await updateOrgPlan(orgId, "free", subscription);
        break;

      default:
        console.log(`[LS Webhook] Unhandled event: ${eventName}`);
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[LS Webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
