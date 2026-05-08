/**
 * OMS — Seed Respondents & Tickets
 * ────────────────────────────────────────────────────────────────
 * Adds sample Indonesian respondents and tickets to Firestore.
 * Run AFTER seed-firestore.mjs (which creates admin + config).
 *
 * Usage:
 *   node scripts/seed-respondents.mjs
 * ────────────────────────────────────────────────────────────────
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth }             from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync }        from "fs";
import { resolve, dirname }    from "path";
import { fileURLToPath }       from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(resolve(__dirname, "service-account.json"), "utf8")
);

initializeApp({ credential: cert(serviceAccount) });
const db   = getFirestore();
const now  = FieldValue.serverTimestamp();
const log  = (msg) => console.log(`  ✓  ${msg}`);
const warn = (msg) => console.warn(`  ⚠  ${msg}`);

// ── Helper: find config ID by name ────────────────────────────
async function findConfigId(collection, name) {
  const snap = await db.collection(collection)
    .where("name", "==", name).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

// ── Helper: create agent users ────────────────────────────────
async function ensureAgent(email, displayName, password) {
  const auth = getAuth();
  let uid;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    warn(`Agent already exists: ${email}`);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      const newUser = await auth.createUser({
        email, password, displayName, emailVerified: true, disabled: false,
      });
      uid = newUser.uid;
      log(`Auth user created: ${email}`);
    } else throw err;
  }

  const docRef = db.collection("users").doc(uid);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    await docRef.set({
      uid, displayName, email, role: "agent", isActive: true,
      avatarInitials: displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
      createdAt: now, updatedAt: now, createdBy: "system-seed",
    });
    log(`Firestore users/${uid} → "${displayName}"`);
  }
  return uid;
}

// ── Main ──────────────────────────────────────────────────────
async function seed() {
  console.log("\n════════════════════════════════════════");
  console.log("  OMS Seed: Respondents & Tickets");
  console.log("════════════════════════════════════════\n");

  // ── 1. Create agent users ───────────────────────────────────
  console.log("[ Step 1 ] Creating agent users...");
  const agentSarah  = await ensureAgent("sarah.wijaya@cbn.or.id",  "Sarah Wijaya",  "123456");
  const agentDaniel = await ensureAgent("daniel.pratama@cbn.or.id","Daniel Pratama", "123456");
  const agentRahel  = await ensureAgent("rahel.siahaan@cbn.or.id", "Rahel Siahaan", "123456");

  // Also create a supervisor
  const auth = getAuth();
  let supUid;
  try {
    const existing = await auth.getUserByEmail("grace.manullang@cbn.or.id");
    supUid = existing.uid;
    warn("Supervisor already exists");
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      const newUser = await auth.createUser({
        email: "grace.manullang@cbn.or.id", password: "123456",
        displayName: "Grace Manullang", emailVerified: true,
      });
      supUid = newUser.uid;
      log("Supervisor auth user created");
    } else throw err;
  }
  const supDoc = db.collection("users").doc(supUid);
  if (!(await supDoc.get()).exists) {
    await supDoc.set({
      uid: supUid, displayName: "Grace Manullang", email: "grace.manullang@cbn.or.id",
      role: "supervisor", isActive: true, avatarInitials: "GM",
      createdAt: now, updatedAt: now, createdBy: "system-seed",
    });
    log("Supervisor Firestore profile created");
  }

  // ── 2. Lookup config IDs ────────────────────────────────────
  console.log("\n[ Step 2 ] Looking up config IDs...");
  const catPrayer     = await findConfigId("categories", "Prayer Request");
  const catCounseling = await findConfigId("categories", "Counseling");
  const catBible      = await findConfigId("categories", "Bible Question");
  const catSalvation  = await findConfigId("categories", "Salvation Decision");
  const catFollowUp   = await findConfigId("categories", "Follow Up");

  const lsWhatsApp    = await findConfigId("lead_sources", "WhatsApp");
  const lsYouTube     = await findConfigId("lead_sources", "YouTube");
  const lsInstagram   = await findConfigId("lead_sources", "Instagram");
  const lsFacebook    = await findConfigId("lead_sources", "Facebook");
  const lsWebsite     = await findConfigId("lead_sources", "Website");

  const outPrayer     = await findConfigId("interaction_outcomes", "Prayer Given");
  const outScripture  = await findConfigId("interaction_outcomes", "Scripture Shared");
  const outFollowUp   = await findConfigId("interaction_outcomes", "Follow Up Scheduled");
  const outSalvation  = await findConfigId("interaction_outcomes", "Salvation Recorded");
  const outNoResponse = await findConfigId("interaction_outcomes", "No Response");

  log("Config IDs resolved");

  // ── 3. Create respondents ───────────────────────────────────
  console.log("\n[ Step 3 ] Creating respondents...");

  const RESPONDENTS = [
    {
      fullName: "Rina Susanti", phone: "+6281234567890", email: "rina.susanti@gmail.com",
      leadSourceId: lsWhatsApp, city: "Jakarta Selatan", age: 32,
      notes: "Ibu rumah tangga, sedang menghadapi masalah keluarga",
      progress: "Doa", programSource: "Solusi", problemCategories: ["Masalah Keluarga", "Kecemasan"],
    },
    {
      fullName: "Budi Hartono", phone: "+6285678901234", email: "budi.hartono@yahoo.com",
      leadSourceId: lsYouTube, city: "Surabaya", age: 45,
      notes: "Pria paruh baya, mencari kedamaian hidup. Tertarik setelah nonton Solusi",
      progress: "Konseling", programSource: "Solusi", problemCategories: ["Depresi", "Pencarian Makna Hidup"],
    },
    {
      fullName: "Dewi Anggraini", phone: "+6287890123456", email: "dewi.a@gmail.com",
      leadSourceId: lsInstagram, city: "Bandung", age: 24,
      notes: "Mahasiswi, banyak pertanyaan tentang iman Kristen",
      progress: "Data", programSource: "Superyouth", problemCategories: ["Pertanyaan Iman"],
    },
    {
      fullName: "Ahmad Fauzi", phone: "+6281345678901", email: "",
      leadSourceId: lsWhatsApp, city: "Semarang", age: 38,
      notes: "Mantan Muslim, ingin belajar lebih tentang Yesus",
      progress: "Salvation", programSource: "Jawaban.com", problemCategories: ["Konversi Iman", "Keluarga Menolak"],
    },
    {
      fullName: "Maria Theresia", phone: "+6289012345678", email: "maria.t@outlook.com",
      leadSourceId: lsFacebook, city: "Yogyakarta", age: 55,
      notes: "Jemaat gereja, minta didoakan untuk kesembuhan",
      progress: "Doa", programSource: "Sentuhan Kasih", problemCategories: ["Penyakit", "Kesembuhan"],
    },
    {
      fullName: "Siti Nurhaliza", phone: "+6282345678901", email: "siti.n@gmail.com",
      leadSourceId: lsWebsite, city: "Medan", age: 29,
      notes: "Menghubungi via website, curhat tentang masalah pernikahan",
      progress: "Konseling", programSource: "Jawaban.com", problemCategories: ["Pernikahan", "Perceraian"],
    },
    {
      fullName: "Putu Dharma", phone: "+6287654321098", email: "putu.d@gmail.com",
      leadSourceId: lsYouTube, city: "Denpasar", age: 21,
      notes: "Mahasiswa Hindu yang penasaran dengan kekristenan setelah nonton YouTube",
      progress: "Data", programSource: "Superbook", problemCategories: ["Pencarian Iman"],
    },
    {
      fullName: "Hana Permata", phone: "+6281567890123", email: "hana.p@yahoo.com",
      leadSourceId: lsInstagram, city: "Makassar", age: 27,
      notes: "Baru percaya, ingin dibaptis",
      progress: "Rekomitmen", programSource: "Superyouth", problemCategories: ["Baptisan", "Pertumbuhan Iman"],
    },
  ];

  const respondentIds = [];
  for (const resp of RESPONDENTS) {
    const ref = db.collection("respondents").doc();
    await ref.set({
      respondentId: ref.id,
      fullName: resp.fullName,
      phone: resp.phone,
      email: resp.email || null,
      leadSourceId: resp.leadSourceId,
      channel: "manual",
      channelSenderId: resp.phone,
      notes: resp.notes,
      age: resp.age,
      city: resp.city,
      progress: resp.progress,
      programSource: resp.programSource,
      problemCategories: resp.problemCategories,
      firstContactDate: now,
      isArchived: false,
      isBlocked: false,
      createdAt: now,
      updatedAt: now,
      createdBy: "system-seed",
    });
    respondentIds.push({ id: ref.id, name: resp.fullName });
    log(`respondents → "${resp.fullName}" (${resp.city})`);
  }

  // ── 4. Create tickets with messages ─────────────────────────
  console.log("\n[ Step 4 ] Creating tickets with messages...");

  let ticketCounter = 0;
  async function createTicket(data) {
    ticketCounter++;
    const ticketNumber = `TKT-${String(ticketCounter).padStart(5, "0")}`;
    const ticketRef = db.collection("tickets").doc();

    await ticketRef.set({
      ticketId: ticketRef.id,
      ticketNumber,
      respondentId: data.respondentId,
      respondentName: data.respondentName,
      assignedAgentId: data.agentId,
      assignedAgentName: data.agentName,
      status: data.status,
      priority: data.priority,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      interactionOutcomeId: data.outcomeId ?? null,
      outcomeName: data.outcomeName ?? null,
      leadSourceId: data.leadSourceId,
      subject: data.subject,
      direction: "inbound",
      handledBy: "human",
      createdAt: now,
      updatedAt: now,
      createdBy: data.agentId ?? "system-seed",
    });

    // Add messages
    for (const msg of data.messages) {
      await ticketRef.collection("messages").add({
        ticketId: ticketRef.id,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderRole: msg.senderRole,
        content: msg.content,
        isInternal: msg.isInternal ?? false,
        createdAt: now,
      });
    }

    log(`${ticketNumber} → "${data.subject}" (${data.status})`);
    return ticketRef.id;
  }

  // Rina - Prayer request (in_progress)
  await createTicket({
    respondentId: respondentIds[0].id, respondentName: "Rina Susanti",
    agentId: agentSarah, agentName: "Sarah Wijaya",
    status: "in_progress", priority: "high",
    categoryId: catPrayer, categoryName: "Prayer Request",
    leadSourceId: lsWhatsApp,
    subject: "Minta didoakan untuk keluarga yang sedang bermasalah",
    messages: [
      { senderId: respondentIds[0].id, senderName: "Rina Susanti", senderRole: "respondent",
        content: "Halo, saya Rina. Saya mau minta didoakan. Keluarga saya sedang dalam masalah besar, suami saya kehilangan pekerjaan dan anak kami sakit." },
      { senderId: agentSarah, senderName: "Sarah Wijaya", senderRole: "agent",
        content: "Halo Kak Rina, terima kasih sudah menghubungi kami. Kami turut prihatin dengan kondisi yang kakak alami. Mari kita doakan bersama. Tuhan Yesus mendengar setiap doa kita." },
      { senderId: agentSarah, senderName: "Sarah Wijaya", senderRole: "agent",
        content: "\"Mazmur 46:2 — Allah itu bagi kita tempat perlindungan dan kekuatan, sebagai penolong dalam kesesakan sangat terbukti.\" Kakak tidak sendirian, kami ada untuk mendampingi." },
      { senderId: respondentIds[0].id, senderName: "Rina Susanti", senderRole: "respondent",
        content: "Terima kasih banyak kak Sarah... saya merasa lebih tenang. Boleh minta didoakan lagi minggu depan?" },
    ],
  });

  // Rina - Follow up (open)
  await createTicket({
    respondentId: respondentIds[0].id, respondentName: "Rina Susanti",
    agentId: agentSarah, agentName: "Sarah Wijaya",
    status: "open", priority: "medium",
    categoryId: catFollowUp, categoryName: "Follow Up",
    leadSourceId: lsWhatsApp,
    subject: "Follow up doa mingguan — Rina Susanti",
    messages: [
      { senderId: "system", senderName: "System", senderRole: "system",
        content: "Follow up terjadwal untuk Rina Susanti. Jadwal: setiap Selasa." },
    ],
  });

  // Budi - Counseling (in_progress)
  await createTicket({
    respondentId: respondentIds[1].id, respondentName: "Budi Hartono",
    agentId: agentDaniel, agentName: "Daniel Pratama",
    status: "in_progress", priority: "high",
    categoryId: catCounseling, categoryName: "Counseling",
    leadSourceId: lsYouTube,
    subject: "Konseling — depresi dan merasa hidup tidak bermakna",
    messages: [
      { senderId: respondentIds[1].id, senderName: "Budi Hartono", senderRole: "respondent",
        content: "Pak, saya nonton video Solusi tentang arti hidup. Saya sudah lama merasa kosong, tidak ada semangat. Apakah Tuhan masih peduli dengan saya?" },
      { senderId: agentDaniel, senderName: "Daniel Pratama", senderRole: "agent",
        content: "Pak Budi, terima kasih sudah berbagi. Tentu Tuhan sangat peduli dengan Bapak. Yeremia 29:11 berkata Tuhan punya rencana damai sejahtera untuk kita. Boleh saya tahu lebih lanjut tentang kondisi Bapak?" },
      { senderId: respondentIds[1].id, senderName: "Budi Hartono", senderRole: "respondent",
        content: "Saya baru di-PHK 3 bulan lalu. Istri mulai mengeluh. Anak-anak butuh biaya sekolah. Saya merasa gagal sebagai kepala keluarga." },
      { senderId: agentDaniel, senderName: "Daniel Pratama", senderRole: "agent",
        content: "Saya mengerti beban yang Bapak rasakan. Tapi ketahuilah bahwa nilai Bapak tidak ditentukan oleh pekerjaan. Apakah Bapak bersedia kalau kita jadwalkan sesi konseling rutin?" },
      { senderId: agentDaniel, senderName: "Daniel Pratama", senderRole: "agent", isInternal: true,
        content: "[Internal] Respondent menunjukkan tanda depresi sedang. Perlu follow up rutin 2x seminggu. Pertimbangkan referral ke konselor profesional." },
    ],
  });

  // Dewi - Bible Question (open)
  await createTicket({
    respondentId: respondentIds[2].id, respondentName: "Dewi Anggraini",
    agentId: agentRahel, agentName: "Rahel Siahaan",
    status: "open", priority: "medium",
    categoryId: catBible, categoryName: "Bible Question",
    leadSourceId: lsInstagram,
    subject: "Pertanyaan tentang Trinitas dan keselamatan",
    messages: [
      { senderId: respondentIds[2].id, senderName: "Dewi Anggraini", senderRole: "respondent",
        content: "Hai kak, aku Dewi. Aku baca-baca tentang Kristen di Instagram. Aku bingung, kenapa Tuhan itu tiga tapi satu? Dan apa bedanya Kristen dengan agama lain?" },
      { senderId: agentRahel, senderName: "Rahel Siahaan", senderRole: "agent",
        content: "Hai Dewi! Pertanyaan yang sangat bagus. Trinitas memang konsep yang unik. Bayangkan air — bisa berbentuk es, cair, dan uap, tapi tetap H2O. Begitu juga Allah Bapa, Yesus, dan Roh Kudus. Mau kita bahas lebih dalam?" },
    ],
  });

  // Ahmad - Salvation (resolved)
  await createTicket({
    respondentId: respondentIds[3].id, respondentName: "Ahmad Fauzi",
    agentId: agentDaniel, agentName: "Daniel Pratama",
    status: "resolved", priority: "high",
    categoryId: catSalvation, categoryName: "Salvation Decision",
    outcomeId: outSalvation, outcomeName: "Salvation Recorded",
    leadSourceId: lsWhatsApp,
    subject: "Keputusan menerima Yesus sebagai Tuhan dan Juruselamat",
    messages: [
      { senderId: respondentIds[3].id, senderName: "Ahmad Fauzi", senderRole: "respondent",
        content: "Pak Daniel, setelah kita bicara minggu lalu, saya sudah berdoa dan memutuskan untuk menerima Yesus. Saya merasakan damai yang belum pernah saya rasakan sebelumnya." },
      { senderId: agentDaniel, senderName: "Daniel Pratama", senderRole: "agent",
        content: "Puji Tuhan, Pak Ahmad!! Ini keputusan terbesar dan terindah dalam hidup Bapak. Surga bersukacita hari ini! Kami akan dampingi Bapak dalam perjalanan iman ini. 🙏" },
      { senderId: agentDaniel, senderName: "Daniel Pratama", senderRole: "agent",
        content: "Saya akan kirimkan buku panduan \"Langkah Pertama\" untuk petobat baru. Dan kita jadwalkan pertemuan online minggu depan untuk mulai pemuridan, ya Pak." },
      { senderId: respondentIds[3].id, senderName: "Ahmad Fauzi", senderRole: "respondent",
        content: "Terima kasih banyak Pak Daniel. Saya siap belajar. Mohon doanya juga karena keluarga saya belum tahu tentang keputusan ini." },
      { senderId: agentDaniel, senderName: "Daniel Pratama", senderRole: "agent", isInternal: true,
        content: "[Internal] SALVATION DECISION — Ahmad Fauzi, ex-Muslim. Butuh pendampingan intensif. Keluarga belum tahu, potensi penolakan. Prioritas tinggi untuk follow up." },
    ],
  });

  // Maria - Prayer for healing (resolved)
  await createTicket({
    respondentId: respondentIds[4].id, respondentName: "Maria Theresia",
    agentId: agentSarah, agentName: "Sarah Wijaya",
    status: "resolved", priority: "medium",
    categoryId: catPrayer, categoryName: "Prayer Request",
    outcomeId: outPrayer, outcomeName: "Prayer Given",
    leadSourceId: lsFacebook,
    subject: "Permohonan doa kesembuhan dari penyakit kanker",
    messages: [
      { senderId: respondentIds[4].id, senderName: "Maria Theresia", senderRole: "respondent",
        content: "Saya Maria, 55 tahun. Baru didiagnosis kanker payudara stadium 2. Saya takut dan butuh kekuatan. Tolong doakan saya." },
      { senderId: agentSarah, senderName: "Sarah Wijaya", senderRole: "agent",
        content: "Ibu Maria, kami turut mendoakan kesembuhan Ibu. Tuhan adalah penyembuh yang agung. Yesaya 53:5 — oleh bilur-bilur-Nya kita menjadi sembuh. Kami akan doakan setiap hari." },
      { senderId: respondentIds[4].id, senderName: "Maria Theresia", senderRole: "respondent",
        content: "Terima kasih... saya merasa dikuatkan. Operasi saya minggu depan. Mohon terus didoakan ya." },
      { senderId: agentSarah, senderName: "Sarah Wijaya", senderRole: "agent",
        content: "Pasti Ibu Maria. Tim kami akan mendoakan Ibu secara khusus. Tuhan memberkati dan menyertai operasinya. 💛" },
    ],
  });

  // Siti - Marriage counseling (in_progress)
  await createTicket({
    respondentId: respondentIds[5].id, respondentName: "Siti Nurhaliza",
    agentId: agentRahel, agentName: "Rahel Siahaan",
    status: "in_progress", priority: "high",
    categoryId: catCounseling, categoryName: "Counseling",
    leadSourceId: lsWebsite,
    subject: "Konseling pernikahan — suami selingkuh",
    messages: [
      { senderId: respondentIds[5].id, senderName: "Siti Nurhaliza", senderRole: "respondent",
        content: "Kak, saya baru tahu suami saya selingkuh. Saya tidak tahu harus bagaimana. Kami punya 2 anak kecil. Apa yang harus saya lakukan?" },
      { senderId: agentRahel, senderName: "Rahel Siahaan", senderRole: "agent",
        content: "Kak Siti, saya turut prihatin. Situasi ini pasti sangat menyakitkan. Yang pertama, kakak tidak sendirian. Boleh ceritakan lebih detail kondisinya?" },
      { senderId: respondentIds[5].id, senderName: "Siti Nurhaliza", senderRole: "respondent",
        content: "Sudah 6 bulan ternyata. Saya cek HP-nya ada chat dengan perempuan lain. Saya mau marah tapi juga takut keluarga hancur." },
    ],
  });

  // Putu - Interested in Christianity (open)
  await createTicket({
    respondentId: respondentIds[6].id, respondentName: "Putu Dharma",
    agentId: null, agentName: null,
    status: "open", priority: "low",
    categoryId: catBible, categoryName: "Bible Question",
    leadSourceId: lsYouTube,
    subject: "Pertanyaan tentang perbedaan Hindu dan Kristen",
    messages: [
      { senderId: respondentIds[6].id, senderName: "Putu Dharma", senderRole: "respondent",
        content: "Om swastiastu. Saya Putu dari Bali. Saya nonton channel Superbook, ceritanya bagus. Apa bedanya Yesus dengan dewa-dewa Hindu?" },
    ],
  });

  // Hana - Baptism request (open)
  await createTicket({
    respondentId: respondentIds[7].id, respondentName: "Hana Permata",
    agentId: agentRahel, agentName: "Rahel Siahaan",
    status: "open", priority: "medium",
    categoryId: catFollowUp, categoryName: "Follow Up",
    leadSourceId: lsInstagram,
    subject: "Pendaftaran baptisan — Hana Permata",
    messages: [
      { senderId: respondentIds[7].id, senderName: "Hana Permata", senderRole: "respondent",
        content: "Kak Rahel, saya sudah yakin mau dibaptis. Kapan jadwal baptisan berikutnya? Saya mau daftar." },
      { senderId: agentRahel, senderName: "Rahel Siahaan", senderRole: "agent",
        content: "Wah puji Tuhan kak Hana! Baptisan berikutnya tanggal 15 bulan depan. Saya kirimkan formulir pendaftarannya ya. Sebelum baptis, ada 3x kelas persiapan yang perlu diikuti." },
    ],
  });

  // Budi - second ticket (closed)
  await createTicket({
    respondentId: respondentIds[1].id, respondentName: "Budi Hartono",
    agentId: agentDaniel, agentName: "Daniel Pratama",
    status: "closed", priority: "medium",
    categoryId: catPrayer, categoryName: "Prayer Request",
    outcomeId: outPrayer, outcomeName: "Prayer Given",
    leadSourceId: lsYouTube,
    subject: "Permohonan doa untuk mencari pekerjaan baru",
    messages: [
      { senderId: respondentIds[1].id, senderName: "Budi Hartono", senderRole: "respondent",
        content: "Pak Daniel, tolong doakan saya sedang interview kerja hari Rabu." },
      { senderId: agentDaniel, senderName: "Daniel Pratama", senderRole: "agent",
        content: "Siap Pak Budi! Kami doakan interview-nya lancar dan Tuhan membuka pintu yang tepat untuk Bapak. Filipi 4:19 — Allahku akan memenuhi segala kebutuhanmu." },
      { senderId: respondentIds[1].id, senderName: "Budi Hartono", senderRole: "respondent",
        content: "PUJI TUHAN Pak Daniel!!! Saya diterima kerja!!! Terima kasih doanya! 🙏🙏🙏" },
      { senderId: agentDaniel, senderName: "Daniel Pratama", senderRole: "agent",
        content: "Luar biasa Pak Budi!! Tuhan itu setia! Selamat ya Pak, semoga menjadi berkat di tempat kerja yang baru! 🎉" },
    ],
  });

  // Ahmad - follow up ticket (open)
  await createTicket({
    respondentId: respondentIds[3].id, respondentName: "Ahmad Fauzi",
    agentId: agentDaniel, agentName: "Daniel Pratama",
    status: "open", priority: "high",
    categoryId: catFollowUp, categoryName: "Follow Up",
    leadSourceId: lsWhatsApp,
    subject: "Pemuridan petobat baru — Ahmad Fauzi (minggu ke-2)",
    messages: [
      { senderId: "system", senderName: "System", senderRole: "system",
        content: "Jadwal pemuridan: Setiap Kamis 19:00 WIB via Zoom. Modul: Langkah Pertama Bab 2 — Siapa Yesus?" },
      { senderId: agentDaniel, senderName: "Daniel Pratama", senderRole: "agent",
        content: "Pak Ahmad, reminder pemuridan malam ini jam 7. Kita akan bahas tentang siapa Yesus Kristus. Sudah baca materinya?" },
    ],
  });

  // ── Summary ─────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════");
  console.log("  Seed Complete!");
  console.log("════════════════════════════════════════");
  console.log(`\n  Respondents: ${respondentIds.length}`);
  console.log(`  Tickets:     ${ticketCounter}`);
  console.log(`  Agents:      3 (Sarah, Daniel, Rahel)`);
  console.log(`  Supervisor:  1 (Grace Manullang)`);
  console.log("\n  New login accounts:");
  console.log("  sarah.wijaya@cbn.or.id    / 123456  (agent)");
  console.log("  daniel.pratama@cbn.or.id  / 123456  (agent)");
  console.log("  rahel.siahaan@cbn.or.id   / 123456  (agent)");
  console.log("  grace.manullang@cbn.or.id / 123456  (supervisor)");
  console.log("════════════════════════════════════════\n");

  process.exit(0);
}

seed().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
