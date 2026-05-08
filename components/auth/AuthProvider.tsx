"use client";
import { useEffect } from "react";
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
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();
  const {
    setActiveOrg,
    setMemberships,
    setLoading: setOrgLoading,
    reset: resetOrg,
  } = useOrgStore();

  useEffect(() => {
    setLoading(true);
    setOrgLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // 1. Fetch user profile
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (!snap.exists()) {
            await auth.signOut();
            setUser(null);
            resetOrg();
            return;
          }

          const data = snap.data();
          if (!data.isActive) {
            await auth.signOut();
            setUser(null);
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

          setUser(user);
          setMemberships(user.orgMemberships);

          // 2. Load active organization
          const activeOrgId = user.primaryOrgId;
          if (activeOrgId) {
            const orgSnap = await getDoc(doc(db, "organizations", activeOrgId));
            if (orgSnap.exists()) {
              const orgData = orgSnap.data();
              setActiveOrg({ orgId: orgSnap.id, ...orgData } as any);

              // Update role based on org membership
              const membership = user.orgMemberships.find(
                (m: any) => m.orgId === activeOrgId
              );
              if (membership) {
                setUser({ ...user, role: membership.role });
              }
            } else {
              setOrgLoading(false);
            }
          } else {
            setOrgLoading(false);
          }
        } catch (err) {
          console.error("Failed to fetch user profile:", err);
          setUser(null);
          resetOrg();
        }
      } else {
        setUser(null);
        resetOrg();
      }
    });

    return () => unsubscribe();
  }, [setUser, setLoading, setActiveOrg, setMemberships, setOrgLoading, resetOrg]);

  return <>{children}</>;
}
