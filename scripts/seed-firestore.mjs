/**
 * OMS — Firestore Seed Script
 * ────────────────────────────────────────────────────────────────
 * Creates:
 *   1. Admin user in Firebase Auth
 *   2. Admin profile document in Firestore "users" collection
 *   3. Master data: categories, lead_sources, interaction_outcomes
 *
 * Usage (run once from project root):
 *   node scripts/seed-firestore.mjs
 *
 * Requirements:
 *   - Place your Service Account JSON at: scripts/service-account.json
 *   - Run: npm install firebase-admin (or use existing installation)
 * ────────────────────────────────────────────────────────────────
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth }             from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync }        from "fs";
import { resolve, dirname }    from "path";
import { fileURLToPath }       from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load Service Account ─────────────────────────────────────────
const serviceAccountPath = resolve(__dirname, "service-account.json");
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
} catch {
  console.error("ERROR: Cannot find scripts/service-account.json");
  console.error("Place your Firebase Service Account JSON file at that path and retry.");
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });

const authAdmin = getAuth();
const db        = getFirestore();
const now       = FieldValue.serverTimestamp();

// ── Config ───────────────────────────────────────────────────────
const ADMIN_USER = {
  displayName: "Bagus Prabangkara",
  email:       "bagus.prabangkara@cbn.or.id",
  password:    "123456",
  role:        "admin",
};

const CATEGORIES = [
  { name: "Prayer Request",    description: "Respondent is requesting prayer" },
  { name: "Counseling",        description: "Respondent needs spiritual counseling" },
  { name: "Bible Question",    description: "Question about scripture or doctrine" },
  { name: "Salvation Decision",description: "Respondent has accepted Christ" },
  { name: "Follow Up",         description: "Scheduled follow-up interaction" },
  { name: "General Inquiry",   description: "General question or information request" },
];

const LEAD_SOURCES = [
  { name: "YouTube",   description: "Respondent found ministry through YouTube channel" },
  { name: "Facebook",  description: "Via Facebook page or ads" },
  { name: "Instagram", description: "Via Instagram profile or reels" },
  { name: "Website",   description: "Via ministry website contact form" },
  { name: "WhatsApp",  description: "Direct WhatsApp message" },
  { name: "Referral",  description: "Referred by another respondent" },
  { name: "TikTok",    description: "Via TikTok videos or live streams" },
  { name: "Email",     description: "Via email newsletter or direct email" },
];

const INTERACTION_OUTCOMES = [
  { name: "Prayer Given",          description: "Agent prayed with the respondent" },
  { name: "Scripture Shared",      description: "Relevant scripture was shared with the respondent" },
  { name: "Referred to Pastor",    description: "Case escalated and referred to a pastor" },
  { name: "No Response",           description: "Respondent did not respond after multiple attempts" },
  { name: "Follow Up Scheduled",   description: "A follow-up interaction has been scheduled" },
  { name: "Salvation Recorded",    description: "Respondent made a salvation decision" },
  { name: "Resources Sent",        description: "Discipleship or ministry resources were sent" },
  { name: "Case Closed",           description: "Issue resolved, no further action needed" },
];

// ── Helpers ──────────────────────────────────────────────────────
const log  = (msg) => console.log(`  ✓  ${msg}`);
const warn = (msg) => console.warn(`  ⚠  ${msg}`);

async function seedCollection(collectionName, items, idField) {
  const collRef = db.collection(collectionName);
  const existing = await collRef.get();

  if (!existing.empty) {
    warn(`${collectionName} already has ${existing.size} document(s). Skipping to avoid duplicates.`);
    return;
  }

  for (const item of items) {
    const docRef = collRef.doc();
    await docRef.set({
      [idField]: docRef.id,
      ...item,
      isActive:  true,
      createdAt: now,
      updatedAt: now,
      createdBy: "system-seed",
    });
    log(`${collectionName} → "${item.name}"`);
  }
}

// ── Main Seed ────────────────────────────────────────────────────
async function seed() {
  console.log("\n════════════════════════════════════════");
  console.log("  OMS Firestore Seed Script");
  console.log("  Project:", serviceAccount.project_id);
  console.log("════════════════════════════════════════\n");

  // ── 1. Create Admin user in Firebase Auth ──────────────────────
  console.log("[ Step 1 ] Creating Admin user in Firebase Auth...");
  let uid;

  try {
    const existingUser = await authAdmin.getUserByEmail(ADMIN_USER.email);
    warn(`User already exists in Auth: ${ADMIN_USER.email} (uid: ${existingUser.uid})`);
    uid = existingUser.uid;
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      const newUser = await authAdmin.createUser({
        email:        ADMIN_USER.email,
        password:     ADMIN_USER.password,
        displayName:  ADMIN_USER.displayName,
        emailVerified: true,
        disabled:     false,
      });
      uid = newUser.uid;
      log(`Firebase Auth user created: ${ADMIN_USER.email}`);
      log(`UID: ${uid}`);
    } else {
      throw err;
    }
  }

  // ── 2. Create Admin document in Firestore "users" ─────────────
  console.log("\n[ Step 2 ] Creating Admin profile in Firestore users collection...");
  const userDocRef = db.collection("users").doc(uid);
  const userDocSnap = await userDocRef.get();

  if (userDocSnap.exists) {
    warn(`Firestore users/${uid} already exists. Skipping.`);
  } else {
    await userDocRef.set({
      uid,
      displayName: ADMIN_USER.displayName,
      email:       ADMIN_USER.email,
      role:        ADMIN_USER.role,
      isActive:    true,
      createdAt:   now,
      updatedAt:   now,
      createdBy:   "system-seed",
    });
    log(`Firestore users/${uid} created for "${ADMIN_USER.displayName}"`);
  }

  // ── 3. Seed master data collections ───────────────────────────
  console.log("\n[ Step 3 ] Seeding categories...");
  await seedCollection("categories", CATEGORIES, "categoryId");

  console.log("\n[ Step 4 ] Seeding lead_sources...");
  await seedCollection("lead_sources", LEAD_SOURCES, "leadSourceId");

  console.log("\n[ Step 5 ] Seeding interaction_outcomes...");
  await seedCollection("interaction_outcomes", INTERACTION_OUTCOMES, "outcomeId");

  // ── Summary ────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════");
  console.log("  Seed Complete!");
  console.log("════════════════════════════════════════");
  console.log("\n  Login credentials:");
  console.log(`  Email    : ${ADMIN_USER.email}`);
  console.log(`  Password : ${ADMIN_USER.password}`);
  console.log(`  Role     : ${ADMIN_USER.role}`);
  console.log(`  UID      : ${uid}`);
  console.log("\n  Collections seeded:");
  console.log("  - users");
  console.log("  - categories");
  console.log("  - lead_sources");
  console.log("  - interaction_outcomes");
  console.log("\n  Next steps:");
  console.log("  1. Open Firebase Console → Authentication → confirm user exists");
  console.log("  2. Open Firestore → confirm all collections are populated");
  console.log("  3. Open the app and login with the credentials above");
  console.log("════════════════════════════════════════\n");

  process.exit(0);
}

seed().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
