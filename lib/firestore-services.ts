// Firestore Service Layer — client-side only via dynamic imports
// All CRUD operations for OMS collections.
// Dynamic imports used to prevent Firebase SDK from being touched during SSR.

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
  return `TKT-${String(index).padStart(5, "0")}`;
}

// ---------------------------------------------------------------------------
// CATEGORIES
// ---------------------------------------------------------------------------
export async function fetchCategories() {
  const [{ collection, getDocs, query, where, orderBy }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  const q = query(collection(db, "categories"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addCategory(data: { name: string; description: string }, createdBy: string) {
  const [{ collection, addDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return addDoc(collection(db, "categories"), {
    name: data.name,
    description: data.description,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
  });
}

export async function updateCategory(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
  const [{ doc, updateDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return updateDoc(doc(db, "categories", id), { ...data, updatedAt: serverTimestamp() });
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
export async function fetchLeadSources() {
  const [{ collection, getDocs, orderBy, query }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  const q = query(collection(db, "lead_sources"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addLeadSource(data: { name: string; description: string }, createdBy: string) {
  const [{ collection, addDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return addDoc(collection(db, "lead_sources"), {
    name: data.name,
    description: data.description,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
  });
}

export async function updateLeadSource(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
  const [{ doc, updateDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return updateDoc(doc(db, "lead_sources", id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteLeadSource(id: string) {
  const [{ doc, deleteDoc }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return deleteDoc(doc(db, "lead_sources", id));
}

// ---------------------------------------------------------------------------
// INTERACTION OUTCOMES
// ---------------------------------------------------------------------------
export async function fetchOutcomes() {
  const [{ collection, getDocs, orderBy, query }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  const q = query(collection(db, "interaction_outcomes"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addOutcome(data: { name: string; description: string }, createdBy: string) {
  const [{ collection, addDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return addDoc(collection(db, "interaction_outcomes"), {
    name: data.name,
    description: data.description,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
  });
}

export async function updateOutcome(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
  const [{ doc, updateDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return updateDoc(doc(db, "interaction_outcomes", id), { ...data, updatedAt: serverTimestamp() });
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
export async function fetchRespondents() {
  const [{ collection, getDocs, query, orderBy }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  // Avoid compound index requirement by filtering isArchived client-side
  const q = query(collection(db, "respondents"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ respondentId: d.id, ...d.data() }))
    .filter((r: any) => !r.isArchived);
}

export async function addRespondent(
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
    ...data,
    channel: data.channel ?? "manual",
    isArchived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
  });
}

export async function updateRespondent(
  id: string,
  data: Record<string, any>
) {
  const [{ doc, updateDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return updateDoc(doc(db, "respondents", id), { ...data, updatedAt: serverTimestamp() });
}

export async function archiveRespondent(id: string) {
  const [{ doc, updateDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return updateDoc(doc(db, "respondents", id), { isArchived: true, updatedAt: serverTimestamp() });
}

// ---------------------------------------------------------------------------
// TICKETS
// ---------------------------------------------------------------------------
export async function fetchTickets() {
  const [{ collection, getDocs, query, orderBy }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
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
  const [{ collection, addDoc, serverTimestamp, getDocs, query, orderBy }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  // Generate ticket number from count
  const countSnap = await getDocs(query(collection(db, "tickets"), orderBy("createdAt", "asc")));
  const ticketNumber = generateTicketNumber(countSnap.size + 1);

  const ref = await addDoc(collection(db, "tickets"), {
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

  // Add initial note as system message if provided
  if (data.initialNote?.trim()) {
    const [{ collection: col, addDoc: add, serverTimestamp: ts }] = await Promise.all([
      import("firebase/firestore"),
    ]);
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
    ...(extra ?? {}),
  };
  if (status === "resolved") updates.resolvedAt = serverTimestamp();
  if (status === "closed")   updates.closedAt   = serverTimestamp();
  return updateDoc(doc(db, "tickets", id), updates);
}

export async function updateTicketClassification(
  id: string,
  data: { categoryId?: string; interactionOutcomeId?: string; assignedAgentId?: string }
) {
  const [{ doc, updateDoc, serverTimestamp }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  return updateDoc(doc(db, "tickets", id), { ...data, updatedAt: serverTimestamp() });
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
  const [{ collection, addDoc, serverTimestamp, doc, updateDoc }, db] = await Promise.all([
    import("firebase/firestore"),
    getDb(),
  ]);
  await addDoc(collection(db, "tickets", ticketId, "messages"), {
    ticketId,
    senderId:   sender.uid,
    senderName: sender.displayName,
    senderRole: sender.role,
    content:    data.content,
    isInternal: data.isInternal,
    createdAt:  serverTimestamp(),
  });
  // Update ticket updatedAt
  await updateDoc(doc(db, "tickets", ticketId), { updatedAt: serverTimestamp() });
}
