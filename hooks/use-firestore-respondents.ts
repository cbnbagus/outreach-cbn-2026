"use client";
import { useState, useEffect } from "react";
import type { Respondent } from "@/types";

/**
 * Real-time respondent list — excludes archived by default.
 */
export function useRespondents(includeArchived: boolean = false) {
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function subscribe() {
      const [{ collection, query, orderBy, onSnapshot }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("@/lib/firebase"),
      ]);

      const q = query(collection(db, "respondents"), orderBy("createdAt", "desc"));

      unsubscribe = onSnapshot(q, (snap) => {
        if (cancelled) return;
        const docs = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              ...data,
              respondentId: d.id,
              createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt ?? "",
              updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt ?? "",
              firstContactDate: data.firstContactDate?.toDate?.()?.toISOString() ?? data.firstContactDate ?? null,
              blockedAt: data.blockedAt?.toDate?.()?.toISOString() ?? null,
            } as unknown as Respondent;
          })
          .filter((r) => includeArchived || !r.isArchived);
        setRespondents(docs);
        setLoading(false);
      });
    }

    subscribe();
    return () => { cancelled = true; unsubscribe?.(); };
  }, [includeArchived]);

  return { respondents, loading };
}

/**
 * Fetch a single respondent by ID (one-time read).
 */
export function useRespondent(respondentId: string | null) {
  const [respondent, setRespondent] = useState<Respondent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!respondentId) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      const [{ doc, onSnapshot }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("@/lib/firebase"),
      ]);

      return onSnapshot(doc(db, "respondents", respondentId!), (snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data();
          setRespondent({
            ...data,
            respondentId: snap.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() ?? "",
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? "",
            firstContactDate: data.firstContactDate?.toDate?.()?.toISOString() ?? null,
            blockedAt: data.blockedAt?.toDate?.()?.toISOString() ?? null,
          } as unknown as Respondent);
        } else {
          setRespondent(null);
        }
        setLoading(false);
      });
    }

    const unsubPromise = load();
    return () => {
      cancelled = true;
      unsubPromise?.then((unsub) => unsub?.());
    };
  }, [respondentId]);

  return { respondent, loading };
}