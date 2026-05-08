// Migration Script: CBN Data → First Tenant in ReachTheSoul
// Run ONCE: node scripts/migrate-to-multitenant.mjs
//
// Prerequisites:
// 1. Create a NEW service account key for reachthesoul-prod
// 2. Save it as scripts/service-account-new.json (gitignored)
// 3. Run this script

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";

const sa = JSON.parse(fs.readFileSync("./scripts/service-account-new.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const ORG_ID = "cbn-indonesia";

async function batchUpdate(collectionName, orgId) {
  const snap = await db.collection(collectionName).get();
  let batch = db.batch();
  let count = 0;

  for (const doc of snap.docs) {
    batch.update(doc.ref, { orgId });
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`  ${collectionName}: ${count} updated...`);
    }
  }
  if (count % 400 !== 0) await batch.commit();
  console.log(`  ${collectionName}: ${count} total migrated.`);
  return count;
}

async function migrate() {
  console.log("=== ReachTheSoul Multi-Tenant Migration ===\n");

  // 1. Create Organization document
  console.log("1. Creating organization: CBN Indonesia...");
  await db.collection("organizations").doc(ORG_ID).set({
    orgId: ORG_ID,
    name: "CBN Indonesia",
    slug: "cbn-indonesia",
    plan: "enterprise",
    limits: {
      maxUsers: 999,
      maxRespondents: 99999,
      maxAIConversations: 99999,
      maxWhatsAppConversations: 99999,
      channels: ["whatsapp_fonnte", "whatsapp_meta", "instagram", "facebook", "youtube", "website"],
    },
    usage: {
      currentUsers: 0,
      currentRespondents: 0,
      aiConversationsThisMonth: 0,
      waConversationsThisMonth: 0,
      usageResetDate: new Date().toISOString(),
    },
    channelConfig: {},
    aiConfig: {
      enabled: true,
      autoReply: true,
      provider: "openai",
      model: "gpt-4o-mini",
      systemPrompt: "",
      escalationTriggers: [],
      channelToggles: {},
    },
    progressSteps: ["Data", "Doa", "Konseling", "Rekomitmen", "Salvation", "POP"],
    programSources: ["Solusi", "Superbook", "Superyouth", "Jawaban.com", "Sentuhan Kasih", "Buletin", "Podcast CBN", "Radio Heartline", "Televisi"],
    billingEmail: "admin@cbn.or.id",
    timezone: "Asia/Jakarta",
    language: "id",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: "migration",
    isActive: true,
  });
  console.log("  Done.\n");

  // 2. Migrate system_config to org document
  console.log("2. Migrating system config...");
  try {
    const channelDoc = await db.collection("system_config").doc("channel_settings").get();
    if (channelDoc.exists) {
      await db.collection("organizations").doc(ORG_ID).update({
        channelConfig: channelDoc.data(),
      });
      console.log("  Channel config migrated.");
    }

    const aiDoc = await db.collection("system_config").doc("ai_settings").get();
    if (aiDoc.exists) {
      await db.collection("organizations").doc(ORG_ID).update({
        aiConfig: aiDoc.data(),
      });
      console.log("  AI config migrated.");
    }
  } catch (err) {
    console.log("  No system_config found (fresh database). Skipping.");
  }
  console.log("");

  // 3. Add orgId to all tenant-scoped collections
  console.log("3. Adding orgId to all collections...");
  await batchUpdate("respondents", ORG_ID);
  await batchUpdate("tickets", ORG_ID);
  await batchUpdate("categories", ORG_ID);
  await batchUpdate("lead_sources", ORG_ID);
  await batchUpdate("interaction_outcomes", ORG_ID);
  console.log("");

  // 4. Update users with org membership
  console.log("4. Updating users with org membership...");
  const users = await db.collection("users").get();
  for (const doc of users.docs) {
    const data = doc.data();
    await doc.ref.update({
      primaryOrgId: ORG_ID,
      orgMemberships: [{
        orgId: ORG_ID,
        orgName: "CBN Indonesia",
        role: data.role ?? "agent",
        joinedAt: new Date().toISOString(),
      }],
      orgRoles: {
        [ORG_ID]: data.role ?? "agent",
      },
    });
  }
  console.log(`  ${users.size} users updated.\n`);

  // 5. Setup ticket counter
  console.log("5. Setting up ticket counter...");
  const tickets = await db.collection("tickets").get();
  await db.collection("counters").doc(`${ORG_ID}_tickets`).set({
    count: tickets.size,
    orgId: ORG_ID,
  });
  console.log(`  Counter set to ${tickets.size}.\n`);

  console.log("===========================================");
  console.log("✅ Migration complete!");
  console.log("===========================================");
  console.log("\nNext steps:");
  console.log("  1. firebase deploy --only firestore:rules");
  console.log("  2. firebase deploy --only firestore:indexes");
  console.log("  3. firebase deploy --only functions");
  console.log("  4. Deploy frontend to Vercel");
}

migrate().catch(console.error);
