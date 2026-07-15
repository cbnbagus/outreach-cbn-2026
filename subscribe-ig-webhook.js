#!/usr/bin/env node
/**
 * subscribe-ig-webhook.js
 *
 * Mendaftarkan akun Instagram profesional ke webhook subscription
 * lewat endpoint /me/subscribed_apps (graph.instagram.com).
 *
 * Ini langkah "Step 3" dari dokumentasi Meta yang tidak bisa dilakukan
 * lewat toggle dashboard untuk Instagram Login API — HARUS via API call.
 *
 * Cara pakai:
 *   node subscribe-ig-webhook.js "<IG_ACCESS_TOKEN>" "<IG_ACCOUNT_ID>"
 *
 * Contoh:
 *   node subscribe-ig-webhook.js "IGAARa..." "17841459774664534"
 */

const token = process.argv[2];
const igAccountId = process.argv[3];

if (!token || !igAccountId) {
  console.error("\n❌ Usage: node subscribe-ig-webhook.js \"<IG_ACCESS_TOKEN>\" \"<IG_ACCOUNT_ID>\"\n");
  process.exit(1);
}

const fields = "messages,messaging_postbacks,messaging_seen,message_reactions";

async function main() {
  console.log("\n🔄 Subscribing IG account", igAccountId, "to webhook fields:", fields, "\n");

  // 1) Subscribe the account to webhook fields
  const subUrl = `https://graph.instagram.com/v25.0/${igAccountId}/subscribed_apps?subscribed_fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(subUrl, { method: "POST" });
    const data = await res.json();
    console.log("📬 POST /subscribed_apps response:");
    console.log(JSON.stringify(data, null, 2));

    if (data.success) {
      console.log("\n✅ SUCCESS — akun IG sekarang subscribed ke webhook. Coba kirim DM lagi.\n");
    } else if (data.error) {
      console.log("\n⚠️  Error dari Meta:", data.error.message, "\n");
    }
  } catch (err) {
    console.error("\n❌ Request gagal:", err.message, "\n");
  }

  // 2) Verify — GET current subscriptions
  console.log("🔍 Verifying current subscriptions...\n");
  const checkUrl = `https://graph.instagram.com/v25.0/${igAccountId}/subscribed_apps?access_token=${encodeURIComponent(token)}`;
  try {
    const res = await fetch(checkUrl);
    const data = await res.json();
    console.log("📋 GET /subscribed_apps response:");
    console.log(JSON.stringify(data, null, 2));
    console.log("");
  } catch (err) {
    console.error("❌ Verify gagal:", err.message);
  }
}

main();
