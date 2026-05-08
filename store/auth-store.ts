"use client";
import { create } from "zustand";
import type { User, UserRole, OrgMembership } from "@/types";

interface AuthState {
  currentUser: User | null;
  role: UserRole | null;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;

  // Role checks (scoped to current org)
  isAdmin: () => boolean;
  isSupervisor: () => boolean;
  isAgent: () => boolean;
  canViewReports: () => boolean;
  canManageConfig: () => boolean;

  // Multi-org helpers
  getOrgMemberships: () => OrgMembership[];
  getRoleInOrg: (orgId: string) => UserRole | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  role: null,
  isLoading: false,

  setUser: (user) =>
    set({ currentUser: user, role: user?.role ?? null, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: () =>
    set({ currentUser: null, role: null, isLoading: false }),

  isAdmin: () => get().role === "admin",
  isSupervisor: () => get().role === "supervisor",
  isAgent: () => get().role === "agent",
  canViewReports: () =>
    get().role === "supervisor" || get().role === "admin",
  canManageConfig: () => get().role === "admin",

  getOrgMemberships: () => get().currentUser?.orgMemberships ?? [],
  getRoleInOrg: (orgId: string) => {
    const membership = get().currentUser?.orgMemberships?.find(
      (m) => m.orgId === orgId
    );
    return membership?.role ?? null;
  },
}));
