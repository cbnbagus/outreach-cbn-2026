"use client";
import { useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthStore } from "@/store/auth-store";
import { useOrgStore } from "@/store/org-store";

/**
 * AuthProvider — multi-tenant version
 * 1. Listens to Firebase Auth state
 * 2. Loads user profile + org memberships
 * 3. Loads active organization data
 * 
 * Key fix: isLoading stays TRUE until auth is fully resolved,
 * preventing premature redirect to login on refresh.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();
  const {
    setActiveOrg,
    setMemberships,
    setLoading: setOrgLoading,
    reset: resetOrg,
  } = useOrgStore();
  const initialized = useRef(false);

  useEffect(() => {
    // Set loading on mount — prevents redirect flash
    if (!initialized.current) {
      setLoading(true);
      setOrgLoading(true);
      initialized.current = true;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // 1. Fetch user profile
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (!snap.exists()) {
            console.warn("[AuthProvider] User doc not found, signing out");
            await auth.signOut();
            setUser(null);
            setLoading(false);
            resetOrg();
            return;
          }

          const data = snap.data();
          if (!data.isActive) {
            console.warn("[AuthProvider] User inactive, signing out");
            await auth.signOut();
            setUser(null);
            setLoading(false);
            resetOrg();
            return;
          }

          const user = {
            uid: firebaseUser.uid,
            displayName: data.displayName ?? "User",
            email: firebaseUser.email ?? "",
            role: data.role,
            isActive: data.isActive,
            createdAt:
              data.createdAt?.toDate?.()?.toISOString() ??
              data.createdAt ??
              new Date().toISOString(),
            avatarInitials: data.avatarInitials,
            primaryOrgId: data.primaryOrgId ?? "",
            orgMemberships: data.orgMemberships ?? [],
            orgRoles: data.orgRoles ?? {},
            isPlatformAdmin: data.isPlatformAdmin ?? false,
          };

          // 2. Load active organization
          const activeOrgId = user.primaryOrgId;
          if (activeOrgId) {
            try {
              const orgSnap = await getDoc(doc(db, "organizations", activeOrgId));
              if (orgSnap.exists()) {
                const orgData = orgSnap.data();
                setActiveOrg({ orgId: orgSnap.id, ...orgData } as any);

                // Update role based on org membership
                const membership = user.orgMemberships.find(
                  (m: any) => m.orgId === activeOrgId
                );
                if (membership) {
                  user.role = membership.role;
                }
              }
            } catch (orgErr) {
              console.error("[AuthProvider] Failed to load org:", orgErr);
            }
          }

          // 3. Set user LAST — after org is loaded
          setUser(user);
          setMemberships(user.orgMemberships);
          setOrgLoading(false);
          setLoading(false);

        } catch (err) {
          console.error("[AuthProvider] Failed to fetch user profile:", err);
          // Don't sign out on Firestore errors — auth token is still valid
          // This prevents logout on transient network issues
          setUser(null);
          setLoading(false);
          resetOrg();
        }
      } else {
        // No Firebase Auth user — genuinely not logged in
        setUser(null);
        setLoading(false);
        resetOrg();
      }
    });

    return () => unsubscribe();
  }, []);

  return <>{children}</>;
}
