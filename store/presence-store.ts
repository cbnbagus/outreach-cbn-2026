
"use client";
import { create } from "zustand";
import type { UserPresence, OnlineStatus } from "@/types";

interface PresenceState {
  presence:        Record<string, UserPresence>;
  initialized:     boolean;
  init:            (currentUid: string) => void;
  setStatus:       (uid: string, status: OnlineStatus, note?: string) => void;
  getPresence:     (uid: string) => UserPresence | undefined;
  getOnlineCount:  () => number;
  getAllPresence:   () => UserPresence[];
  cleanup:         () => void;
}

let _intervalId: ReturnType<typeof setInterval> | null = null;

export const usePresenceStore = create<PresenceState>((set, get) => ({
  presence:    {},
  initialized: false,

  init: (currentUid: string) => {
    if (get().initialized) return;
    const map: Record<string, UserPresence> = {};
    map[currentUid] = {
      uid: currentUid,
      status: "online",
      shift: "Morning",
      lastSeen: new Date().toISOString(),
      activeTickets: 0,
    };
    set({ presence: map, initialized: true });
  },

  setStatus: (uid, status, note) => {
    set((state) => ({
      presence: {
        ...state.presence,
        [uid]: {
          ...(state.presence[uid] ?? { uid, shift: "Morning", activeTickets: 0 }),
          status,
          lastSeen: new Date().toISOString(),
          ...(note !== undefined ? { note } : {}),
        },
      },
    }));
  },

  getPresence: (uid) => get().presence[uid],
  getOnlineCount: () => Object.values(get().presence).filter((p) => p.status === "online" || p.status === "busy").length,
  getAllPresence: () => Object.values(get().presence),

  cleanup: () => {
    if (_intervalId) { clearInterval(_intervalId); _intervalId = null; }
    set({ initialized: false });
  },
}));

