"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Phone, PhoneOff, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Mic, MicOff, PauseCircle, PlayCircle, Hash, Delete,
  ChevronDown, X, User, PhoneCall, Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallStore } from "@/store/call-store";

// ─── Duration formatter ───────────────────────────────────────────────────────
function fmtDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ─── Dialpad keys ─────────────────────────────────────────────────────────────
const DIALPAD = [
  ["1", ""], ["2", "ABC"], ["3", "DEF"],
  ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
  ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"],
  ["*", ""], ["0", "+"], ["#", ""],
];

export function SoftPhone() {
  const {
    view, dialInput, activeCall, missedCount,
    setView, setDialInput, startOutbound, answerInbound, hangUp,
    toggleMute, toggleHold, tick, simulateInbound, clearMissed,
  } = useCallStore();

  const [postNotes, setPostNotes]   = useState("");
  const [showDialpad, setShowDialpad] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Call timer
  useEffect(() => {
    if (activeCall && view === "active" && !activeCall.isOnHold) {
      intervalRef.current = setInterval(() => tick(), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [view, activeCall?.isOnHold]);

  const handleKey = (k: string) => setDialInput(dialInput + k);
  const handleBackspace = () => setDialInput(dialInput.slice(0, -1));

  // ── Minimized / FAB ───────────────────────────────────────────────────────
  if (view === "minimized") {
    return (
      <button
        onClick={() => setView("dialer")}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-all",
          "bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
        )}
      >
        <Phone size={15} />
        <span>Dial</span>
        {missedCount > 0 && (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold">
            {missedCount}
          </span>
        )}
      </button>
    );
  }

  // ── Incoming call ──────────────────────────────────────────────────────────
  if (view === "incoming" && activeCall) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-72 rounded-2xl shadow-2xl bg-card border border-border overflow-hidden">
        <div className="bg-emerald-600 px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-white uppercase tracking-wide flex items-center gap-1.5">
            <PhoneIncoming size={12} /> Incoming Call
          </span>
        </div>
        <div className="p-4 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 ring-4 ring-emerald-100 animate-pulse">
            <User size={22} className="text-muted-foreground" />
          </div>
          {activeCall.respondentName ? (
            <>
              <p className="font-semibold text-foreground">{activeCall.respondentName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{activeCall.remoteNumber}</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-foreground">{activeCall.remoteNumber}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Unknown caller</p>
            </>
          )}
        </div>
        <div className="flex gap-3 px-4 pb-4">
          <button
            onClick={() => { if (intervalRef.current) clearInterval(intervalRef.current); hangUp(); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
          >
            <PhoneOff size={14} /> Decline
          </button>
          <button
            onClick={() => answerInbound(activeCall.remoteNumber, activeCall.provider)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
          >
            <Phone size={14} /> Answer
          </button>
        </div>
      </div>
    );
  }

  // ── Active call ────────────────────────────────────────────────────────────
  if (view === "active" && activeCall) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-72 rounded-2xl shadow-2xl bg-card border border-border overflow-hidden">
        {/* Header */}
        <div className={cn(
          "px-4 py-2.5 flex items-center justify-between",
          activeCall.isOnHold ? "bg-amber-500" : "bg-emerald-600"
        )}>
          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
            {activeCall.direction === "inbound"
              ? <PhoneIncoming size={12} />
              : <PhoneOutgoing size={12} />}
            {activeCall.isOnHold ? "On Hold" : "Active Call"} &bull; {fmtDuration(activeCall.durationSeconds)}
          </span>
          <button onClick={() => setShowDialpad((p) => !p)} className="text-white/70 hover:text-white transition-colors">
            <Hash size={13} />
          </button>
        </div>

        {/* Caller info */}
        <div className="px-4 pt-4 pb-2 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
            <User size={18} className="text-muted-foreground" />
          </div>
          {activeCall.respondentName ? (
            <>
              <p className="font-semibold text-foreground text-sm">{activeCall.respondentName}</p>
              {activeCall.respondentId && (
                <Link href={`/dashboard/respondents/${activeCall.respondentId}`} className="text-[10px] text-primary hover:underline">
                  View Profile
                </Link>
              )}
            </>
          ) : (
            <>
              <p className="font-semibold text-foreground text-sm">{activeCall.remoteNumber}</p>
              <p className="text-[10px] text-muted-foreground">No matching respondent</p>
            </>
          )}
        </div>

        {/* In-call dialpad */}
        {showDialpad && (
          <div className="px-4 pb-2">
            <div className="grid grid-cols-3 gap-1 mb-2">
              {DIALPAD.map(([digit, sub]) => (
                <button
                  key={digit}
                  onClick={() => handleKey(digit)}
                  className="flex flex-col items-center justify-center py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  <span className="text-sm font-semibold text-foreground leading-none">{digit}</span>
                  {sub && <span className="text-[8px] text-muted-foreground mt-0.5">{sub}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="grid grid-cols-3 gap-2 px-4 pb-3">
          <button
            onClick={toggleMute}
            className={cn("flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-medium transition-colors",
              activeCall.isMuted ? "bg-red-50 text-red-600 border border-red-200" : "bg-muted text-muted-foreground hover:bg-muted/80")}
          >
            {activeCall.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            {activeCall.isMuted ? "Unmute" : "Mute"}
          </button>
          <button
            onClick={toggleHold}
            className={cn("flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-medium transition-colors",
              activeCall.isOnHold ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-muted text-muted-foreground hover:bg-muted/80")}
          >
            {activeCall.isOnHold ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
            {activeCall.isOnHold ? "Resume" : "Hold"}
          </button>
          <button
            onClick={() => hangUp()}
            className="flex flex-col items-center gap-1 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
          >
            <PhoneOff size={16} />End
          </button>
        </div>
      </div>
    );
  }

  // ── Post-call ──────────────────────────────────────────────────────────────
  if (view === "postcall") {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-72 rounded-2xl shadow-2xl bg-card border border-border overflow-hidden">
        <div className="bg-slate-700 px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
            <PhoneOff size={12} /> Call Ended
          </span>
          <button onClick={() => setView("minimized")} className="text-white/70 hover:text-white">
            <X size={13} />
          </button>
        </div>
        <div className="p-4">
          <p className="text-xs font-medium text-foreground mb-1.5">Add call notes</p>
          <textarea
            value={postNotes}
            onChange={(e) => setPostNotes(e.target.value)}
            rows={3}
            placeholder="What was discussed? Any follow-up needed?"
            className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex gap-2 mt-2">
            <Link
              href="/dashboard/tickets/new"
              className="flex-1 text-center text-xs font-semibold py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              Create Ticket
            </Link>
            <button
              onClick={() => { setPostNotes(""); setView("minimized"); }}
              className="flex-1 text-xs font-medium py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Dialer ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 rounded-2xl shadow-2xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
          <PhoneCall size={12} /> Softphone
        </span>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/calls" onClick={() => setView("minimized")} className="text-white/60 hover:text-white transition-colors" title="Call Log">
            <Maximize2 size={12} />
          </Link>
          <button onClick={() => setView("minimized")} className="text-white/60 hover:text-white transition-colors">
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Number input */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 border border-border rounded-lg bg-muted/30 px-3 py-2">
          <input
            value={dialInput}
            onChange={(e) => setDialInput(e.target.value)}
            placeholder="Enter number..."
            className="flex-1 bg-transparent text-sm font-mono text-foreground placeholder-muted-foreground/50 outline-none tracking-wider"
          />
          {dialInput && (
            <button onClick={handleBackspace} className="text-muted-foreground hover:text-foreground">
              <Delete size={14} />
            </button>
          )}
        </div>
        {/* Resolved respondent hint */}
        {dialInput.length >= 6 && (() => {
          const r = useCallStore.getState().resolveByPhone(dialInput);
          return r.respondentName ? (
            <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
              <User size={9} /> Matched: <strong>{r.respondentName}</strong>
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground mt-1">No respondent matched — new contact</p>
          );
        })()}
      </div>

      {/* Dialpad */}
      <div className="px-4 pb-2">
        <div className="grid grid-cols-3 gap-1.5">
          {DIALPAD.map(([digit, sub]) => (
            <button
              key={digit}
              onClick={() => handleKey(digit)}
              className="flex flex-col items-center justify-center py-2.5 rounded-xl bg-muted hover:bg-muted/60 transition-colors active:scale-95"
            >
              <span className="text-base font-semibold text-foreground leading-none">{digit}</span>
              {sub && <span className="text-[8px] text-muted-foreground mt-0.5">{sub}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Call button + simulate inbound */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => dialInput && startOutbound(dialInput)}
          disabled={!dialInput}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Phone size={15} /> Call
        </button>
        <button
          onClick={() => simulateInbound("+63918887766")}
          title="Simulate inbound call (demo)"
          className="px-3 py-2.5 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <PhoneIncoming size={15} />
        </button>
      </div>
    </div>
  );
}
