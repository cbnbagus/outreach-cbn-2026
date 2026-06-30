// Firestore Service Layer — MULTI-TENANT version
// All CRUD operations scoped by orgId for tenant isolation.

import type {
  Respondent,
  Ticket,
  TicketStatus,
  TicketPriority,
} from "@/types";

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
async function getDb() {
  const [{ getFirestore }, { getFirebaseApp }] = await Promise.all([
    import("firebase/firestore"),
    import("@/lib/firebase"),
  ]);
  return getFirestore(getFirebaseApp());
}

function generateTicketNumber(index: number): string {
  return `CBN-${String(index).padStart(5, "0")}`;
}

// ---------------------------------------------------------------------------
// CATEGORIES
// ---------------------------------------------------------------------------
export async function fetchCategories(orgId: string) {
  const [{ collection, getDocs, query, where, orderBy }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  const q = query(
    collection(db, "categories"),
    where("orgId", "==", orgId),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addCategory(
  orgId: string,
  data: { name: string; description: string },
  createdBy: string
) {
  const [{ collection, addDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return addDoc(collection(db, "categories"), {
    orgId,
    name: data.name,
    description: data.description,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
  });
}

export async function updateCategory(
  id: string,
  data: { name?: string; description?: string; isActive?: boolean }
) {
  const [{ doc, updateDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return updateDoc(doc(db, "categories", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCategory(id: string) {
  const [{ doc, deleteDoc }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return deleteDoc(doc(db, "categories", id));
}

// ---------------------------------------------------------------------------
// LEAD SOURCES
// ---------------------------------------------------------------------------
export async function fetchLeadSources(orgId: string) {
  const [{ collection, getDocs, orderBy, query, where }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  const q = query(
    collection(db, "lead_sources"),
    where("orgId", "==", orgId),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addLeadSource(
  orgId: string,
  data: { name: string; description: string },
  createdBy: string
) {
  const [{ collection, addDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return addDoc(collection(db, "lead_sources"), {
    orgId,
    name: data.name,
    description: data.description,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
  });
}

export async function updateLeadSource(
  id: string,
  data: { name?: string; description?: string; isActive?: boolean }
) {
  const [{ doc, updateDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return updateDoc(doc(db, "lead_sources", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteLeadSource(id: string) {
  const [{ doc, deleteDoc }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return deleteDoc(doc(db, "lead_sources", id));
}

const DEFAULT_LEAD_SOURCES = [
  { name: "WhatsApp",  description: "Direct WhatsApp message" },
  { name: "Instagram", description: "Via Instagram profile or reels" },
  { name: "Facebook",  description: "Via Facebook page or ads" },
  { name: "YouTube",   description: "Respondent found ministry through YouTube channel" },
  { name: "Website",   description: "Via ministry website contact form" },
  { name: "Referral",  description: "Referred by another respondent" },
  { name: "Event",     description: "Via event or conference" },
];

export async function seedDefaultLeadSources(orgId: string, createdBy: string) {
  const [{ collection, addDoc, getDocs, query, where, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);

  // Double-check: only seed if truly empty
  const existing = await getDocs(
    query(collection(db, "lead_sources"), where("orgId", "==", orgId))
  );
  if (!existing.empty) return;

  const batch = DEFAULT_LEAD_SOURCES.map((ls) =>
    addDoc(collection(db, "lead_sources"), {
      orgId,
      name: ls.name,
      description: ls.description,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy,
    })
  );
  await Promise.all(batch);
}

// ---------------------------------------------------------------------------
// PROGRAM SOURCES
// ---------------------------------------------------------------------------
export async function fetchProgramSources(orgId: string) {
  const [{ collection, getDocs, orderBy, query, where }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  const q = query(
    collection(db, "program_sources"),
    where("orgId", "==", orgId),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addProgramSource(
  orgId: string,
  data: { name: string; description: string },
  createdBy: string
) {
  const [{ collection, addDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return addDoc(collection(db, "program_sources"), {
    orgId,
    name: data.name,
    description: data.description,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
  });
}

export async function updateProgramSource(
  id: string,
  data: { name?: string; description?: string; isActive?: boolean }
) {
  const [{ doc, updateDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return updateDoc(doc(db, "program_sources", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProgramSource(id: string) {
  const [{ doc, deleteDoc }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return deleteDoc(doc(db, "program_sources", id));
}

const DEFAULT_PROGRAM_SOURCES_SEED = [
  { name: "TV Program",      description: "Respondent from a TV program" },
  { name: "Sunday Service",   description: "Respondent from Sunday service" },
  { name: "Youth Service",    description: "Respondent from youth service" },
  { name: "Women Service",    description: "Respondent from women's ministry" },
  { name: "Men Service",      description: "Respondent from men's ministry" },
  { name: "Online Event",     description: "Respondent from online event or webinar" },
  { name: "Crusade / Rally",  description: "Respondent from evangelistic event" },
  { name: "Other",            description: "Other source not listed" },
];

export async function seedDefaultProgramSources(orgId: string, createdBy: string) {
  const [{ collection, addDoc, getDocs, query, where, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);

  // Only seed if truly empty
  const existing = await getDocs(
    query(collection(db, "program_sources"), where("orgId", "==", orgId))
  );
  if (!existing.empty) return;

  const batch = DEFAULT_PROGRAM_SOURCES_SEED.map((ps) =>
    addDoc(collection(db, "program_sources"), {
      orgId,
      name: ps.name,
      description: ps.description,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy,
    })
  );
  await Promise.all(batch);
}

// ---------------------------------------------------------------------------
// INTERACTION OUTCOMES
// ---------------------------------------------------------------------------
export async function fetchOutcomes(orgId: string) {
  const [{ collection, getDocs, orderBy, query, where }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  const q = query(
    collection(db, "interaction_outcomes"),
    where("orgId", "==", orgId),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addOutcome(
  orgId: string,
  data: { name: string; description: string },
  createdBy: string
) {
  const [{ collection, addDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return addDoc(collection(db, "interaction_outcomes"), {
    orgId,
    name: data.name,
    description: data.description,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
  });
}

export async function updateOutcome(
  id: string,
  data: { name?: string; description?: string; isActive?: boolean }
) {
  const [{ doc, updateDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return updateDoc(doc(db, "interaction_outcomes", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteOutcome(id: string) {
  const [{ doc, deleteDoc }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return deleteDoc(doc(db, "interaction_outcomes", id));
}

// ---------------------------------------------------------------------------
// RESPONDENTS
// ---------------------------------------------------------------------------
export async function fetchRespondents(orgId: string) {
  const [{ collection, getDocs, query, orderBy, where }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  const q = query(
    collection(db, "respondents"),
    where("orgId", "==", orgId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ respondentId: d.id, ...d.data() }))
    .filter((r: any) => !r.isArchived);
}

export async function addRespondent(
  orgId: string,
  data: {
    fullName: string;
    phone?: string;
    email?: string;
    leadSourceId: string;
    notes?: string;
    channel?: string;
    channelSenderId?: string;
  },
  createdBy: string
) {
  const [{ collection, addDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return addDoc(collection(db, "respondents"), {
    orgId,
    fullName: data.fullName,
    phone: data.phone ?? null,
    email: data.email ?? null,
    leadSourceId: data.leadSourceId,
    notes: data.notes ?? null,
    channel: data.channel ?? "manual",
    channelSenderId: data.channelSenderId ?? null,
    isArchived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
  });
}

export async function updateRespondent(id: string, data: Record<string, any>) {
  const [{ doc, updateDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  const cleanData: Record<string, any> = { updatedAt: serverTimestamp() };
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) cleanData[key] = value;
  }
  return updateDoc(doc(db, "respondents", id), cleanData);
}

export async function archiveRespondent(id: string) {
  const [{ doc, updateDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return updateDoc(doc(db, "respondents", id), {
    isArchived: true,
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// TICKETS
// ---------------------------------------------------------------------------
export async function fetchTickets(orgId: string) {
  const [{ collection, getDocs, query, orderBy, where }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  const q = query(
    collection(db, "tickets"),
    where("orgId", "==", orgId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ticketId: d.id, ...d.data() }));
}

export async function fetchTicketById(id: string) {
  const [{ doc, getDoc }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  const snap = await getDoc(doc(db, "tickets", id));
  if (!snap.exists()) return null;
  return { ticketId: snap.id, ...snap.data() };
}

export async function addTicket(
  orgId: string,
  data: {
    respondentId: string;
    subject: string;
    priority: TicketPriority;
    leadSourceId?: string;
    categoryId?: string;
    assignedAgentId?: string;
    initialNote?: string;
  },
  createdBy: string
) {
  const [{ collection, addDoc, serverTimestamp, getDocs, query, orderBy, where }, db] =
    await Promise.all([import("firebase/firestore"), getDb()]);

  // Generate ticket number from org-scoped count
  const countSnap = await getDocs(
    query(
      collection(db, "tickets"),
      where("orgId", "==", orgId),
      orderBy("createdAt", "asc")
    )
  );
  const ticketNumber = generateTicketNumber(countSnap.size + 1);

  const ref = await addDoc(collection(db, "tickets"), {
    orgId,
    ticketNumber,
    respondentId: data.respondentId,
    assignedAgentId: data.assignedAgentId ?? null,
    status: "open" as TicketStatus,
    categoryId: data.categoryId ?? null,
    interactionOutcomeId: null,
    leadSourceId: data.leadSourceId ?? null,
    subject: data.subject,
    priority: data.priority,
    closedAt: null,
    resolvedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
  });

  if (data.initialNote?.trim()) {
    const [{ collection: col, addDoc: add, serverTimestamp: ts }] =
      await Promise.all([import("firebase/firestore")]);
    await add(col(db, "tickets", ref.id, "messages"), {
      ticketId: ref.id,
      senderId: createdBy,
      senderName: "System",
      senderRole: "system",
      content: data.initialNote,
      isInternal: true,
      createdAt: ts(),
    });
  }

  return ref;
}

export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
  extra?: { categoryId?: string; interactionOutcomeId?: string }
) {
  const [{ doc, updateDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  const updates: Record<string, any> = {
    status,
    updatedAt: serverTimestamp(),
  };
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value !== undefined) updates[key] = value;
    }
  }
  if (status === "resolved") updates.resolvedAt = serverTimestamp();
  if (status === "closed") updates.closedAt = serverTimestamp();
  return updateDoc(doc(db, "tickets", id), updates);
}

export async function updateTicketClassification(
  id: string,
  data: {
    categoryId?: string;
    interactionOutcomeId?: string;
    assignedAgentId?: string;
  }
) {
  const [{ doc, updateDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  const cleanData: Record<string, any> = { updatedAt: serverTimestamp() };
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) cleanData[key] = value;
  }
  return updateDoc(doc(db, "tickets", id), cleanData);
}

export async function updateTicketFollowUp(
  id: string,
  data: {
    scheduledAt: string;
    followUpChannel: string;
    followUpNote?: string;
    followUpCreatedBy: string;
  }
) {
  const [{ doc, updateDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return updateDoc(doc(db, "tickets", id), {
    scheduledAt: data.scheduledAt,
    followUpChannel: data.followUpChannel,
    followUpNote: data.followUpNote ?? "",
    followUpCreatedBy: data.followUpCreatedBy,
    updatedAt: serverTimestamp(),
  });
}

export async function clearTicketFollowUp(id: string) {
  const [{ doc, updateDoc, serverTimestamp, deleteField }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return updateDoc(doc(db, "tickets", id), {
    scheduledAt: deleteField(),
    followUpChannel: deleteField(),
    followUpNote: deleteField(),
    followUpCreatedBy: deleteField(),
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// MESSAGES (subcollection: tickets/{ticketId}/messages)
// ---------------------------------------------------------------------------
export async function fetchMessages(ticketId: string) {
  const [{ collection, getDocs, query, orderBy }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  const q = query(
    collection(db, "tickets", ticketId, "messages"),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ messageId: d.id, ...d.data() }));
}

export async function sendMessage(
  ticketId: string,
  data: { content: string; isInternal: boolean },
  sender: { uid: string; displayName: string; role: string }
) {
  const [{ collection, addDoc, serverTimestamp, doc, updateDoc }, db] =
    await Promise.all([import("firebase/firestore"), getDb()]);
  await addDoc(collection(db, "tickets", ticketId, "messages"), {
    ticketId,
    senderId: sender.uid,
    senderName: sender.displayName,
    senderRole: sender.role,
    content: data.content,
    isInternal: data.isInternal,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "tickets", ticketId), {
    updatedAt: serverTimestamp(),
  });
}
// ---------------------------------------------------------------------------
// SOCIAL ACCOUNTS (collection: social_accounts)
// ---------------------------------------------------------------------------
export async function fetchSocialAccounts() {
  const [{ collection, getDocs, query, orderBy }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  const q = query(collection(db, "social_accounts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addSocialAccount(data: Record<string, any>, createdBy: string) {
  const [{ collection, addDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return addDoc(collection(db, "social_accounts"), {
    ...data,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
  });
}

export async function updateSocialAccount(id: string, data: Record<string, any>) {
  const [{ doc, updateDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  const cleanData: Record<string, any> = { updatedAt: serverTimestamp() };
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) cleanData[key] = value;
  }
  return updateDoc(doc(db, "social_accounts", id), cleanData);
}

export async function deleteSocialAccount(id: string) {
  const [{ doc, deleteDoc }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return deleteDoc(doc(db, "social_accounts", id));
}
// ---------------------------------------------------------------------------
// PROGRAM SOURCE HISTORY (multi-touch attribution)
// Appends a source to programSourceHistory[] and updates programSource (latest).
// Skips if the same source was already recorded today (dedup).
// ---------------------------------------------------------------------------
export async function addProgramSourceTouch(
  respondentId: string,
  source: string,
  ticketId?: string
) {
  const [{ doc, getDoc, updateDoc, arrayUnion, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);

  const trimmed = (source ?? "").trim();
  if (!trimmed) return;

  const ref = doc(db, "respondents", respondentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  const history: any[] = Array.isArray(data.programSourceHistory) ? data.programSourceHistory : [];

  // Dedup: skip if same source already recorded today
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const alreadyToday = history.some(
    (h) => h.source === trimmed && (h.date ?? "").slice(0, 10) === today
  );

  const updates: Record<string, any> = {
    programSource: trimmed, // latest (for quick display + backward compat)
    updatedAt: serverTimestamp(),
  };

  if (!alreadyToday) {
    updates.programSourceHistory = arrayUnion({
      source: trimmed,
      date: new Date().toISOString(),
      ticketId: ticketId ?? null,
    });
  }

  await updateDoc(ref, updates);
}