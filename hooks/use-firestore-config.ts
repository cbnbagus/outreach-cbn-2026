"use client";
import { useState, useEffect, useRef } from "react";
import { useOrgStore } from "@/store/org-store";
import { useAuthStore } from "@/store/auth-store";

/**
 * Generic real-time Firestore collection hook — MULTI-TENANT version.
 * Automatically filters by active orgId.
 */
export function useFirestoreCollection<T extends Record<string, any>>(
  collectionName: string,
  idField: string = "id"
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const orgId = activeOrg?.orgId;

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function subscribe() {
      try {
        const [{ collection, query, orderBy, where, onSnapshot }, { db }] =
          await Promise.all([
            import("firebase/firestore"),
            import("@/lib/firebase"),
          ]);

        const q = query(
          collection(db, collectionName),
          where("orgId", "==", orgId),
          orderBy("createdAt", "asc")
        );

        unsubscribe = onSnapshot(
          q,
          (snap) => {
            if (cancelled) return;
            const docs = snap.docs.map((d) => {
              const data = d.data();
              return {
                ...data,
                [idField]: d.id,
                id: d.id,
                createdAt:
                  data.createdAt?.toDate?.()?.toISOString() ??
                  data.createdAt ?? "",
                updatedAt:
                  data.updatedAt?.toDate?.()?.toISOString() ??
                  data.updatedAt ?? "",
              } as unknown as T;
            });
            setItems(docs);
            setLoading(false);
          },
          (err) => {
            if (cancelled) return;
            console.error(`[useFirestoreCollection] ${collectionName}:`, err);
            setError(err.message);
            setLoading(false);
          }
        );
      } catch (err: any) {
        if (!cancelled) {
          console.error(`[useFirestoreCollection] ${collectionName}:`, err);
          setError(err.message);
          setLoading(false);
        }
      }
    }

    subscribe();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [collectionName, idField, orgId]);

  return { items, loading, error };
}

// ─── Convenience hooks ─────────────────────────────────────────────

export function useCategories() {
  return useFirestoreCollection("categories", "categoryId");
}

export function useLeadSources() {
  const result = useFirestoreCollection("lead_sources", "leadSourceId");
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const currentUser = useAuthStore((s) => s.currentUser);
  const seeded = useRef(false);

  useEffect(() => {
    if (result.loading || seeded.current) return;
    if (!activeOrg?.orgId || !currentUser?.uid) return;
    if (result.items.length > 0) return;

    // Lead sources empty for this org — seed defaults
    seeded.current = true;
    import("@/lib/firestore-services").then(({ seedDefaultLeadSources }) => {
      seedDefaultLeadSources(activeOrg.orgId, currentUser.uid).catch(console.error);
    });
  }, [result.loading, result.items.length, activeOrg?.orgId, currentUser?.uid]);

  return result;
}

export function useOutcomes() {
  return useFirestoreCollection("interaction_outcomes", "outcomeId");
}

export function useUsers() {
  // Users are NOT org-scoped in this hook — they use a separate query
  // This hook returns ALL users; org-scoped user list should filter by orgMemberships
  return useFirestoreCollection("users", "uid");
}
