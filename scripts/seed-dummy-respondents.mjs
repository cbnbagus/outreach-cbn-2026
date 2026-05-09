// Seed 15 Dummy Respondents for Testing
// Usage: node scripts/seed-dummy-respondents.mjs
//
// Creates realistic prayer & counseling respondents with tickets and messages.
// Run after setup-first-org.mjs

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";

const sa = JSON.parse(fs.readFileSync("./scripts/service-account-new.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// ╔══════════════════════════════════════════════════════════════╗
// ║  EDIT: Set your orgId (check Firestore → organizations)     ║
// ╚══════════════════════════════════════════════════════════════╝
const ORG_ID = "reachthesoul-admin"; // ← Change to your org slug

const RESPONDENTS = [
  {
    fullName: "Sarah Mitchell",
    phone: "+14155550101",
    email: "sarah.m@gmail.com",
    channel: "whatsapp_meta",
    leadSource: "WhatsApp",
    notes: "Single mother, struggling with anxiety. Reached out for prayer support.",
    ticket: { subject: "Prayer request — anxiety and fear", priority: "high", status: "open" },
    messages: [
      { from: "respondent", text: "Hi, I found your prayer line online. I've been having terrible anxiety attacks lately and I don't know what to do. Can someone pray with me?" },
      { from: "ai", text: "Thank you for reaching out, Sarah. I'm so sorry you're going through this. You are not alone, and it takes courage to ask for help. I'd love to pray with you right now. Can you tell me a bit more about what's been happening?" },
      { from: "respondent", text: "I'm a single mom with two kids. Lost my job last month and the bills are piling up. I can't sleep at night. I feel like I'm failing everyone." },
    ],
  },
  {
    fullName: "David Okonkwo",
    phone: "+2348012345678",
    email: "david.ok@yahoo.com",
    channel: "whatsapp_meta",
    leadSource: "WhatsApp",
    notes: "Church leader from Lagos. Seeking counseling for burnout.",
    ticket: { subject: "Pastoral burnout — need someone to talk to", priority: "high", status: "in_progress" },
    messages: [
      { from: "respondent", text: "Good evening. I'm a pastor and I've been feeling completely burnt out. I don't know who to talk to because everyone in my church looks up to me. I feel like a fraud." },
      { from: "ai", text: "Pastor David, thank you for trusting us with something so personal. Burnout among pastors is more common than people realize, and acknowledging it is the first step toward healing. You are not a fraud — you are a shepherd who also needs care. Would you like to speak with one of our counselors?" },
    ],
  },
  {
    fullName: "Maria Santos",
    phone: "+639171234567",
    email: "maria.santos@outlook.com",
    channel: "whatsapp_fonnte",
    leadSource: "Instagram",
    notes: "From Philippines. Dealing with grief after losing her father.",
    ticket: { subject: "Grief counseling — loss of parent", priority: "medium", status: "open" },
    messages: [
      { from: "respondent", text: "My father passed away two weeks ago and I can't stop crying. My family says I should be strong but I just can't. Does God hear my prayers?" },
      { from: "ai", text: "Maria, I'm deeply sorry for the loss of your father. Grief is not weakness — it's love with nowhere to go. And yes, God absolutely hears your prayers. Psalm 34:18 says 'The Lord is close to the brokenhearted.' Please know that we are here for you." },
    ],
  },
  {
    fullName: "James Chen",
    phone: "+6281234567890",
    email: "james.chen@gmail.com",
    channel: "whatsapp_meta",
    leadSource: "Website",
    notes: "University student. Questions about faith and meaning of life.",
    ticket: { subject: "Questions about faith — university student", priority: "medium", status: "open" },
    messages: [
      { from: "respondent", text: "Hi, I'm not really a Christian but my roommate told me about your prayer service. I've been thinking a lot about life and death lately. Is there really a God who cares about me personally?" },
    ],
  },
  {
    fullName: "Grace Kimani",
    phone: "+254712345678",
    email: "grace.k@gmail.com",
    channel: "instagram",
    leadSource: "Instagram",
    notes: "From Kenya. Struggling with marriage issues.",
    ticket: { subject: "Marriage counseling request", priority: "high", status: "in_progress" },
    messages: [
      { from: "respondent", text: "I saw your post on Instagram. My husband and I have been fighting every day for months. We have three children and I'm scared we're heading for divorce. Can someone counsel us?" },
      { from: "ai", text: "Grace, thank you for reaching out. Marriage struggles are painful, especially when children are involved. We have counselors who specialize in marriage and family care. Would you prefer to speak with someone via video call, phone, or continue via chat?" },
      { from: "respondent", text: "Chat is fine for now. I don't want my husband to know I'm reaching out yet." },
    ],
  },
  {
    fullName: "Roberto Garcia",
    phone: "+5511987654321",
    email: "roberto.g@hotmail.com",
    channel: "facebook",
    leadSource: "Facebook",
    notes: "From Brazil. Recovering from addiction. Active in recovery program.",
    ticket: { subject: "Prayer support — addiction recovery", priority: "medium", status: "resolved" },
    messages: [
      { from: "respondent", text: "I've been clean for 90 days today. But the temptation is real. Can you pray for my strength?" },
      { from: "ai", text: "Roberto, congratulations on 90 days! That is an incredible milestone and a testimony of God's grace in your life. Let me pray for you right now: Lord, we thank you for Roberto's courage and perseverance. Grant him strength for each day..." },
      { from: "respondent", text: "Thank you so much. That prayer really touched my heart. I'll keep pushing forward." },
    ],
  },
  {
    fullName: "Aisha Yusuf",
    phone: "+628567891234",
    email: null,
    channel: "whatsapp_fonnte",
    leadSource: "WhatsApp",
    notes: "Indonesian. Recently converted. Facing family opposition.",
    ticket: { subject: "New believer — facing persecution from family", priority: "high", status: "open" },
    messages: [
      { from: "respondent", text: "Halo, saya baru menjadi Kristen 3 bulan lalu. Keluarga saya sangat marah dan mengancam akan mengusir saya dari rumah. Saya sangat takut tapi saya tidak mau meninggalkan iman saya. Tolong doakan saya." },
      { from: "ai", text: "Dear Aisha, thank you for your courage in sharing this with us. Your faith is precious, and we understand how difficult this must be. You are not alone — many believers have walked this path. Let me connect you with a counselor who specializes in supporting new believers. In the meantime, know that God sees your faithfulness." },
    ],
  },
  {
    fullName: "Michael Brown",
    phone: "+12025551234",
    email: "michael.brown@gmail.com",
    channel: "whatsapp_meta",
    leadSource: "Referral",
    notes: "Referred by his pastor. Dealing with depression.",
    ticket: { subject: "Depression — referred by pastor", priority: "high", status: "in_progress" },
    messages: [
      { from: "respondent", text: "My pastor told me to contact you. I've been dealing with severe depression for the past year. Some days I can barely get out of bed. I've been praying but it doesn't seem to help." },
      { from: "agent", text: "Michael, I'm glad your pastor connected you with us. Depression is a real medical condition and it's important you know that seeking help is a sign of strength, not weakness. Are you currently seeing a doctor or therapist?" },
      { from: "respondent", text: "No, I haven't seen anyone. I thought I should just pray harder." },
      { from: "agent", text: "Prayer is powerful, and God often works through medical professionals too. I'd strongly encourage you to see a doctor alongside our prayer support. We can continue meeting weekly for prayer and encouragement. Would that be helpful?" },
    ],
  },
  {
    fullName: "Priya Sharma",
    phone: "+919876543210",
    email: "priya.s@gmail.com",
    channel: "whatsapp_meta",
    leadSource: "YouTube",
    notes: "From India. Watched a testimony video on YouTube. Wants to know more about Jesus.",
    ticket: { subject: "Interested in knowing about Jesus", priority: "medium", status: "open" },
    messages: [
      { from: "respondent", text: "I watched a video on your YouTube channel about a woman who was healed from cancer. Is this real? I want to know more about Jesus." },
    ],
  },
  {
    fullName: "Emma Wilson",
    phone: "+447911123456",
    email: "emma.w@icloud.com",
    channel: "instagram",
    leadSource: "Instagram",
    notes: "From UK. Teenager dealing with self-harm. ESCALATED to senior counselor.",
    ticket: { subject: "URGENT — self-harm", priority: "high", status: "in_progress" },
    messages: [
      { from: "respondent", text: "I don't know why I'm messaging you. I've been cutting myself and I don't want to live anymore. Nobody understands." },
      { from: "ai", text: "[ESCALATED TO HUMAN COUNSELOR] Emma, I hear you and I'm so glad you reached out. What you're feeling matters, and you matter. A counselor is joining this conversation right now to talk with you. Please stay with us." },
      { from: "agent", text: "Hi Emma, I'm here. My name is Rachel and I'm a trained counselor. You were brave to reach out. Can you tell me — are you safe right now?" },
    ],
  },
  {
    fullName: "John Mwangi",
    phone: "+254798765432",
    email: "john.mwangi@gmail.com",
    channel: "whatsapp_fonnte",
    leadSource: "Event",
    notes: "Attended a crusade event. Accepted Christ. Follow-up in progress.",
    ticket: { subject: "Follow-up — salvation at crusade event", priority: "low", status: "resolved" },
    messages: [
      { from: "agent", text: "Hi John! We're so glad you gave your life to Christ at the crusade last week. How are you feeling? Do you have any questions about your new faith?" },
      { from: "respondent", text: "I'm feeling great! But I don't know where to start. Should I read the Bible? Which church should I go to?" },
      { from: "agent", text: "Great questions! I'd recommend starting with the Gospel of John — it's a beautiful introduction to who Jesus is. As for church, what area do you live in? I can recommend a Bible-believing church near you." },
    ],
  },
  {
    fullName: "Lisa Tanaka",
    phone: "+818012345678",
    email: "lisa.t@softbank.jp",
    channel: "website",
    leadSource: "Website",
    notes: "From Japan. First-time visitor to the website. Curious about Christianity.",
    ticket: { subject: "First-time inquiry from website chat", priority: "low", status: "open" },
    messages: [
      { from: "respondent", text: "Hello, I found your website through Google. I'm not religious but I've been feeling empty lately. A friend told me that prayer might help. How does prayer work?" },
    ],
  },
  {
    fullName: "Carlos Mendez",
    phone: "+525512345678",
    email: "carlos.m@protonmail.com",
    channel: "facebook",
    leadSource: "Facebook",
    notes: "From Mexico. Recently divorced. Seeking spiritual guidance.",
    ticket: { subject: "Spiritual guidance after divorce", priority: "medium", status: "open" },
    messages: [
      { from: "respondent", text: "My wife left me 6 months ago. I feel abandoned by everyone, including God. Does God still love me even after a divorce?" },
      { from: "ai", text: "Carlos, I'm sorry you're going through this pain. Divorce is one of the most difficult experiences anyone can face. And yes — God's love for you has not changed. Romans 8:38-39 assures us that nothing can separate us from the love of God. Would you like to talk more about what you're going through?" },
    ],
  },
  {
    fullName: "Rachel Kim",
    phone: "+821012345678",
    email: "rachel.kim@naver.com",
    channel: "whatsapp_meta",
    leadSource: "Referral",
    notes: "From South Korea. Missionary kid dealing with identity crisis.",
    ticket: { subject: "Identity & faith crisis — MK support", priority: "medium", status: "open" },
    messages: [
      { from: "respondent", text: "I grew up as a missionary kid in Southeast Asia. Now I'm back in Korea and I don't know who I am. I don't feel Korean, I don't feel like I belong anywhere. I love God but sometimes I resent my parents for the life they chose for our family." },
    ],
  },
  {
    fullName: "Daniel Osei",
    phone: "+233241234567",
    email: "daniel.osei@gmail.com",
    channel: "whatsapp_fonnte",
    leadSource: "WhatsApp",
    notes: "From Ghana. Church worship leader. Struggling with secret sin.",
    ticket: { subject: "Confidential — struggling with sin", priority: "high", status: "open" },
    messages: [
      { from: "respondent", text: "I'm a worship leader in my church. Nobody knows this but I've been struggling with pornography addiction for years. I feel like such a hypocrite standing on stage every Sunday. I need help but I'm terrified of anyone finding out." },
      { from: "ai", text: "Daniel, thank you for having the courage to share this. The fact that you're reaching out shows that God is working in your heart. This struggle is more common among church leaders than you might think, and there is no shame in seeking help. Everything shared here is confidential. Would you like to connect with a counselor who specializes in helping ministry leaders?" },
    ],
  },
];

async function getLeadSourceId(name) {
  const snap = await db.collection("lead_sources")
    .where("orgId", "==", ORG_ID)
    .where("name", "==", name)
    .limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

async function seed() {
  console.log("=== Seeding 15 Dummy Respondents ===\n");
  console.log(`Organization: ${ORG_ID}\n`);

  let ticketCount = 0;
  const counterDoc = await db.collection("counters").doc(`${ORG_ID}_tickets`).get();
  if (counterDoc.exists) ticketCount = counterDoc.data()?.count ?? 0;

  for (let i = 0; i < RESPONDENTS.length; i++) {
    const r = RESPONDENTS[i];
    console.log(`${i + 1}. ${r.fullName} (${r.channel})...`);

    // Get lead source ID
    const leadSourceId = await getLeadSourceId(r.leadSource) ?? "";

    // Create respondent
    const respRef = db.collection("respondents").doc();
    await respRef.set({
      respondentId: respRef.id,
      orgId: ORG_ID,
      fullName: r.fullName,
      phone: r.phone,
      email: r.email,
      channel: r.channel,
      channelSenderId: r.phone,
      leadSourceId,
      isArchived: false,
      notes: r.notes,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Create ticket
    ticketCount++;
    const ticketNumber = `RTS-${String(ticketCount).padStart(5, "0")}`;
    const ticketRef = db.collection("tickets").doc();
    await ticketRef.set({
      ticketId: ticketRef.id,
      ticketNumber,
      orgId: ORG_ID,
      respondentId: respRef.id,
      respondentName: r.fullName,
      subject: r.ticket.subject,
      channel: r.channel,
      status: r.ticket.status,
      priority: r.ticket.priority,
      assignedAgentId: null,
      assignedAgentName: null,
      categoryId: null,
      categoryName: null,
      interactionOutcomeId: null,
      lastMessage: r.messages[r.messages.length - 1]?.text?.substring(0, 100) ?? "",
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessageSender: r.fullName,
      hasUnread: r.ticket.status === "open",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Create messages
    for (const msg of r.messages) {
      await db.collection(`tickets/${ticketRef.id}/messages`).add({
        senderId: msg.from === "respondent" ? r.phone : (msg.from === "ai" ? "ai-system" : "agent-001"),
        senderName: msg.from === "respondent" ? r.fullName : (msg.from === "ai" ? "AI Counselor" : "Counselor"),
        senderRole: msg.from === "respondent" ? "respondent" : (msg.from === "ai" ? "ai" : "agent"),
        channel: r.channel,
        content: msg.text,
        isInternal: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    console.log(`   ✓ Respondent + Ticket ${ticketNumber} + ${r.messages.length} messages`);
  }

  // Update counter
  await db.collection("counters").doc(`${ORG_ID}_tickets`).set({
    count: ticketCount,
    orgId: ORG_ID,
  });

  // Update org usage
  await db.collection("organizations").doc(ORG_ID).update({
    "usage.currentRespondents": RESPONDENTS.length,
  });

  console.log(`\n✅ Done! ${RESPONDENTS.length} respondents, ${ticketCount} tickets created.`);
  console.log("Refresh your dashboard to see them!");
}

seed().catch(console.error);
