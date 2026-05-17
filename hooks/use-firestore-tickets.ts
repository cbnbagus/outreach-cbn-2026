"use client";
import { useState, useEffect } from "react";
import type { Ticket, Message } from "@/types";

/**
 * Real-time ticket list — updates automatically when tickets are created/modified.
 */
export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function subscribe() {
      const [{ collection, query, orderBy, onSnapshot }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("@/lib/firebase"),
      ]);

      const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));

      unsubscribe = onSnapshot(q, (snap) => {
        if (cancelled) return;
        const docs = snap.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            ticketId: d.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt ?? "",
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt ?? "",
            resolvedAt: data.resolvedAt?.toDate?.()?.toISOString() ?? null,
            closedAt: data.closedAt?.toDate?.()?.toISOString() ?? null,
            scheduledAt: data.scheduledAt?.toDate?.()?.toISOString() ?? data.scheduledAt ?? null,
            followUpChannel: data.followUpChannel ?? null,
            followUpNote: data.followUpNote ?? null,
            followUpCreatedBy: data.followUpCreatedBy ?? null,
          } as unknown as Ticket;
        });
        setTickets(docs);
        setLoading(false);
      });
    }

    subscribe();
    return () => { cancelled = true; unsubscribe?.(); };
  }, []);

  return { tickets, loading };
}

/**
 * Real-time tickets for a specific respondent.
 */
export function useTicketsByRespondent(respondentId: string | null) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!respondentId) { setLoading(false); return; }
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function subscribe() {
      const [{ collection, query, where, orderBy, onSnapshot }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("@/lib/firebase"),
      ]);

      const q = query(
        collection(db, "tickets"),
        where("respondentId", "==", respondentId),
        orderBy("createdAt", "desc")
      );

      unsubscribe = onSnapshot(q, (snap) => {
        if (cancelled) return;
        const docs = snap.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            ticketId: d.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() ?? "",
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? "",
          } as unknown as Ticket;
        });
        setTickets(docs);
        setLoading(false);
      });
    }

    subscribe();
    return () => { cancelled = true; unsubscribe?.(); };
  }, [respondentId]);

  return { tickets, loading };
}

/**
 * Real-time messages for a specific ticket (subcollection).
 */
export function useMessages(ticketId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticketId) { setLoading(false); return; }
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function subscribe() {
      const [{ collection, query, orderBy, onSnapshot }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("@/lib/firebase"),
      ]);

      const q = query(
        collection(db, "tickets", ticketId!, "messages"),
        orderBy("createdAt", "asc")
      );

      unsubscribe = onSnapshot(q, (snap) => {
        if (cancelled) return;
        const docs = snap.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            messageId: d.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt ?? "",
          } as unknown as Message;
        });
        setMessages(docs);
        setLoading(false);
      });
    }

    subscribe();
    return () => { cancelled = true; unsubscribe?.(); };
  }, [ticketId]);

  return { messages, loading };
}