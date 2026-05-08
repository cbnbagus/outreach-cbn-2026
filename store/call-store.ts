import { create } from "zustand";
import type { CallDirection, CallProvider, CallRecord } from "@/types";

export type SoftPhoneView = "minimized" | "dialer" | "active" | "incoming" | "postcall";

interface ActiveCall {
  callId:          string;
  direction:       CallDirection;
  provider:        CallProvider;
  remoteNumber:    string;
  respondentId?:   string;
  respondentName?: string;
  startedAt:       string;
  answeredAt?:     string;
  isMuted:         boolean;
  isOnHold:        boolean;
  durationSeconds: number;
}

interface CallStoreState {
  // Softphone widget
  view:          SoftPhoneView;
  dialInput:     string;
  activeCall:    ActiveCall | null;
  callLog:       CallRecord[];
  missedCount:   number;

  // Actions
  setView:        (v: SoftPhoneView) => void;
  setDialInput:   (v: string) => void;
  startOutbound:  (toNumber: string, provider?: CallProvider) => void;
  answerInbound:  (from: string, provider?: CallProvider) => void;
  hangUp:         (notes?: string) => void;
  toggleMute:     () => void;
  toggleHold:     () => void;
  tick:           () => void;
  simulateInbound:(from: string) => void;
  clearMissed:    () => void;

  resolveByPhone: (phone: string) => { respondentId?: string; respondentName?: string };
}

const makeCallId = () => `call${Date.now()}`;

export const useCallStore = create<CallStoreState>((set, get) => ({
  view:        "minimized",
  dialInput:   "",
  activeCall:  null,
  callLog:     [],
  missedCount: 0,

  setView:      (view)      => set({ view }),
  setDialInput: (dialInput) => set({ dialInput }),
  clearMissed:  ()          => set({ missedCount: 0 }),

  resolveByPhone: (_phone) => {
    // In production, this would query Firestore respondents by phone
    return {};
  },

  startOutbound: (toNumber, provider = "twilio") => {
    const resolved = get().resolveByPhone(toNumber);
    const call: ActiveCall = {
      callId:          makeCallId(),
      direction:       "outbound",
      provider,
      remoteNumber:    toNumber,
      respondentId:    resolved.respondentId,
      respondentName:  resolved.respondentName,
      startedAt:       new Date().toISOString(),
      answeredAt:      new Date().toISOString(),
      isMuted:         false,
      isOnHold:        false,
      durationSeconds: 0,
    };
    set({ activeCall: call, view: "active", dialInput: "" });
  },

  answerInbound: (from, provider = "twilio") => {
    const resolved = get().resolveByPhone(from);
    const call: ActiveCall = {
      callId:          makeCallId(),
      direction:       "inbound",
      provider,
      remoteNumber:    from,
      respondentId:    resolved.respondentId,
      respondentName:  resolved.respondentName,
      startedAt:       new Date().toISOString(),
      answeredAt:      new Date().toISOString(),
      isMuted:         false,
      isOnHold:        false,
      durationSeconds: 0,
    };
    set({ activeCall: call, view: "active" });
  },

  hangUp: (notes) => {
    const { activeCall, callLog } = get();
    if (!activeCall) return;

    const record: CallRecord = {
      callId:          activeCall.callId,
      respondentId:    activeCall.respondentId,
      respondentName:  activeCall.respondentName,
      agentId:         "current-user",
      agentName:       "You",
      direction:       activeCall.direction,
      status:          "completed",
      provider:        activeCall.provider,
      fromNumber:      activeCall.direction === "outbound" ? "me" : activeCall.remoteNumber,
      toNumber:        activeCall.direction === "outbound" ? activeCall.remoteNumber : "me",
      startedAt:       activeCall.startedAt,
      answeredAt:      activeCall.answeredAt,
      endedAt:         new Date().toISOString(),
      durationSeconds: activeCall.durationSeconds,
      notes:           notes ?? "",
      createdAt:       activeCall.startedAt,
    };

    set({ activeCall: null, view: "postcall", callLog: [record, ...callLog] });

    setTimeout(() => {
      set((s) => (s.view === "postcall" ? { view: "minimized" } : {}));
    }, 4000);
  },

  toggleMute: () =>
    set((s) =>
      s.activeCall ? { activeCall: { ...s.activeCall, isMuted: !s.activeCall.isMuted } } : {}
    ),

  toggleHold: () =>
    set((s) =>
      s.activeCall ? { activeCall: { ...s.activeCall, isOnHold: !s.activeCall.isOnHold } } : {}
    ),

  tick: () =>
    set((s) =>
      s.activeCall && !s.activeCall.isOnHold
        ? { activeCall: { ...s.activeCall, durationSeconds: s.activeCall.durationSeconds + 1 } }
        : {}
    ),

  simulateInbound: (from) => {
    const resolved = get().resolveByPhone(from);
    const incoming: ActiveCall = {
      callId:          makeCallId(),
      direction:       "inbound",
      provider:        "twilio",
      remoteNumber:    from,
      respondentId:    resolved.respondentId,
      respondentName:  resolved.respondentName,
      startedAt:       new Date().toISOString(),
      isMuted:         false,
      isOnHold:        false,
      durationSeconds: 0,
    };
    set({ activeCall: incoming, view: "incoming", missedCount: get().missedCount });
  },
}));
