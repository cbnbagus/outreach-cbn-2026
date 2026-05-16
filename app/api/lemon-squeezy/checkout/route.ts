import { NextRequest, NextResponse } from "next/server";

const LS_API_KEY = process.env.LEMONSQUEEZY_API_KEY ?? "";
const LS_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID ?? "";

const VARIANT_MAP: Record<string, string> = {
  starter: process.env.LS_VARIANT_STARTER ?? "1662320",
  growth: process.env.LS_VARIANT_GROWTH ?? "1662333",
  enterprise: process.env.LS_VARIANT_ENTERPRISE ?? "1662339",
};

export async function POST(req: NextRequest) {
  try {
    const { plan, orgId, userEmail, userName } = await req.json();

    if (!plan || !orgId) {
      return NextResponse.json({ error: "plan and orgId required" }, { status: 400 });
    }

    const variantId = VARIANT_MAP[plan];
    if (!variantId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LS_API_KEY}`,
        "Content-Type": "application/vnd.api+json",
        "Accept": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: userEmail ?? "",
              name: userName ?? "",
              custom: {
                org_id: orgId,
                plan_tier: plan,
              },
            },
            checkout_options: {
              dark: false,
              logo: true,
              button_color: "#2DD4BF",
            },
            product_options: {
              redirect_url: `https://reachthesoul.org/dashboard/billing?upgraded=${plan}`,
              receipt_button_text: "Go to Dashboard",
              receipt_link_url: "https://reachthesoul.org/dashboard",
            },
          },
          relationships: {
            store: { data: { type: "stores", id: LS_STORE_ID } },
            variant: { data: { type: "variants", id: variantId } },
          },
        },
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error("Lemon Squeezy error:", errData);
      return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
    }

    const data = await response.json();
    const checkoutUrl = data.data?.attributes?.url;

    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
