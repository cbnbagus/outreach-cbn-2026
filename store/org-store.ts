"use client";
import { create } from "zustand";
import type { Organization, OrgMembership } from "@/types";

interface OrgState {
  activeOrg: Organization | null;
  memberships: OrgMembership[];
  isLoading: boolean;

  setActiveOrg: (org: Organization) => void;
  setMemberships: (memberships: OrgMembership[]) => void;
  switchOrg: (orgId: string) => void;
  setLoading: (loading: boolean) => void;
  getActiveOrgId: () => string;
  reset: () => void;
}

export const useOrgStore = create<OrgState>((set, get) => ({
  activeOrg: null,
  memberships: [],
  isLoading: true,

  setActiveOrg: (org) => set({ activeOrg: org, isLoading: false }),
  setMemberships: (memberships) => set({ memberships }),
  switchOrg: (orgId) => {
    const membership = get().memberships.find((m) => m.orgId === orgId);
    if (membership) {
      set({ isLoading: true });
      // Org data will be re-fetched by AuthProvider on next render
    }
  },
  setLoading: (loading) => set({ isLoading: loading }),
  getActiveOrgId: () => {
    const org = get().activeOrg;
    if (!org) throw new Error("No active organization. User must select an org.");
    return org.orgId;
  },
  reset: () => set({ activeOrg: null, memberships: [], isLoading: true }),
}));

/** Helper to get orgId outside React components */
export function getActiveOrgId(): string {
  return useOrgStore.getState().getActiveOrgId();
}
