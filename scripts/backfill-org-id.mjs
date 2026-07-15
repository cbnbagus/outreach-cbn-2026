// Backfill orgId untuk respondents & tickets lama yang belum punya orgId.
// Run ONCE: node scripts/backfill-org-id.mjs
// Requires: service account key (same setup as setup-first-org.mjs)

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const ORG_ID = "IQKRTIEc9RotIklRFLxP"; // CBN Indonesia

const serviceAccount = JSON.parse(
  readFileSync(new URL("./serviceAccountKey.json", import.meta.url))
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function backfill(collectionName) {
  const snap = await db.collection(collectionName).get();
  let updated = 0;
  for (const doc of snap.docs) {
    if (!doc.data().orgId) {
      await doc.ref.update({ orgId: ORG_ID });
      updated++;
      console.log(`  [${collectionName}] ${doc.id} → orgId set`);
    }
  }
  console.log(`${collectionName}: ${updated}/${snap.size} updated`);
}

console.log(`Backfilling orgId = ${ORG_ID}\n`);
await backfill("respondents");
await backfill("tickets");
console.log("\nDone.");
