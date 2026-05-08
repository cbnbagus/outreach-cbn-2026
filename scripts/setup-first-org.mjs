// Setup Script: Create First Admin User + First Organization
// Run ONCE: node scripts/setup-first-org.mjs
//
// Prerequisites:
// 1. Create a service account key for reachthesoul-prod
//    Firebase Console → Project Settings → Service Accounts → Generate New Private Key
// 2. Save it as scripts/service-account-new.json
// 3. Run this script

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";

// ╔══════════════════════════════════════════════════════════════╗
// ║  EDIT THESE VALUES                                          ║
// ╚══════════════════════════════════════════════════════════════╝

const ADMIN_EMAIL    = "admin@reachthesoul.org";  // ← Your email
const ADMIN_PASSWORD = "Admin123!";                      // ← Change this!
const ADMIN_NAME     = "Bagus Prabangkara";              // ← Your name

const ORG_ID         = "reachthesoul-admin";              // ← Org slug
const ORG_NAME       = "ReachTheSoul Admin";              // ← Org display name

// ╔══════════════════════════════════════════════════════════════╗
// ║  DO NOT EDIT BELOW                                          ║
// ╚══════════════════════════════════════════════════════════════╝

const sa = JSON.parse(fs.readFileSync("./scripts/service-account-new.json", "utf8"));
initializeApp({ credential: cert(sa) });
const authAdmin = getAuth();
const db = getFirestore();

async function setup() {
  console.log("=== ReachTheSoul — First Org Setup ===\n");

  // 1. Create Firebase Auth user
  console.log("1. Creating admin user in Firebase Auth...");
  let uid;
  try {
    const existing = await authAdmin.getUserByEmail(ADMIN_EMAIL);
    uid = existing.uid;
    console.log(`   User already exists: ${uid}`);
  } catch {
    const user = await authAdmin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      displayName: ADMIN_NAME,
    });
    uid = user.uid;
    console.log(`   Created: ${uid}`);
  }

  // 2. Create Organization
  console.log("2. Creating organization...");
  await db.collection("organizations").doc(ORG_ID).set({
    orgId: ORG_ID,
    name: ORG_NAME,
    slug: ORG_ID,
    plan: "enterprise",
    logoUrl: "",
    primaryColor: "#2B6CB0",
    limits: {
      maxUsers: 999,
      maxRespondents: 99999,
      maxAIConversations: 99999,
      maxWhatsAppConversations: 99999,
      channels: ["whatsapp_fonnte", "whatsapp_meta", "instagram", "facebook", "youtube", "website"],
    },
    usage: {
      currentUsers: 1,
      currentRespondents: 0,
      aiConversationsThisMonth: 0,
      waConversationsThisMonth: 0,
      usageResetDate: new Date().toISOString(),
    },
    channelConfig: {},
    aiConfig: {
      enabled: false,
      autoReply: false,
      provider: "openai",
      apiKey: "",
      model: "gpt-4o-mini",
      systemPrompt: "You are a compassionate ministry counselor for ReachTheSoul. Respond with empathy, wisdom, and care.",
      escalationTriggers: [
        {
          reason: "prayer_request",
          label: "Prayer Request",
          keywords: ["pray", "prayer", "doa", "doakan", "berdoa", "mohon doa"],
          enabled: true,
        },
        {
          reason: "crisis",
          label: "Crisis / Urgent",
          keywords: ["bunuh diri", "suicide", "putus asa", "hopeless", "mau mati", "tidak kuat"],
          enabled: true,
        },
      ],
      channelToggles: {},
    },
    progressSteps: ["Data", "Doa", "Konseling", "Rekomitmen", "Salvation", "POP"],
    programSources: ["Website", "WhatsApp", "Instagram", "Facebook", "YouTube", "Referral", "Event"],
    billingEmail: ADMIN_EMAIL,
    timezone: "Asia/Jakarta",
    language: "id",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: uid,
    isActive: true,
  });
  console.log(`   Organization "${ORG_NAME}" created.\n`);

  // 3. Create User document in Firestore
  console.log("3. Creating user profile in Firestore...");
  const initials = ADMIN_NAME.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  await db.collection("users").doc(uid).set({
    uid,
    displayName: ADMIN_NAME,
    email: ADMIN_EMAIL,
    role: "admin",
    isActive: true,
    avatarInitials: initials,
    primaryOrgId: ORG_ID,
    orgMemberships: [
      {
        orgId: ORG_ID,
        orgName: ORG_NAME,
        role: "admin",
        joinedAt: new Date().toISOString(),
      },
    ],
    orgRoles: {
      [ORG_ID]: "admin",
    },
    isPlatformAdmin: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log(`   User profile created.\n`);

  // 4. Setup ticket counter
  console.log("4. Setting up ticket counter...");
  await db.collection("counters").doc(`${ORG_ID}_tickets`).set({
    count: 0,
    orgId: ORG_ID,
  });
  console.log("   Counter initialized.\n");

  // 5. Create default categories
  console.log("5. Creating default categories...");
  const categories = ["General Inquiry", "Prayer Request", "Counseling", "Follow-up", "Testimony"];
  for (const name of categories) {
    await db.collection("categories").add({
      orgId: ORG_ID,
      name,
      description: "",
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: uid,
    });
  }
  console.log(`   ${categories.length} categories created.\n`);

  // 6. Create default lead sources
  console.log("6. Creating default lead sources...");
  const leadSources = ["WhatsApp", "Instagram", "Facebook", "YouTube", "Website", "Referral", "Event"];
  for (const name of leadSources) {
    await db.collection("lead_sources").add({
      orgId: ORG_ID,
      name,
      description: "",
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: uid,
    });
  }
  console.log(`   ${leadSources.length} lead sources created.\n`);

  // 7. Create default outcomes
  console.log("7. Creating default outcomes...");
  const outcomes = ["Accepted Christ", "Rededication", "Referred to Pastor", "Joined Small Group", "Follow-up Scheduled", "No Response"];
  for (const name of outcomes) {
    await db.collection("interaction_outcomes").add({
      orgId: ORG_ID,
      name,
      description: "",
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: uid,
    });
  }
  console.log(`   ${outcomes.length} outcomes created.\n`);

  console.log("=============================================");
  console.log("✅ Setup complete!");
  console.log("=============================================");
  console.log(`\nLogin credentials:`);
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`\nOrganization: ${ORG_NAME} (${ORG_ID})`);
  console.log(`\nOpen your Vercel URL and login!`);
}

setup().catch(console.error);
