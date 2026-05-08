"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  PhoneIncoming, PhoneOutgoing, PhoneMissed, Phone,
  Clock, User, Ticket, Search, Filter, PhoneCall,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCallStore } from "@/store/call-store";
import { cn } from "@/lib/utils";
import type { CallDirection, CallStatus } from "@/types";

function fmtDuration(s?: number) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  };
}

const DIR_CONFIG: Record<CallDirection, { icon: typeof Phone; label: string; color: string; bg: string }> = {
  inbound:  { icon: PhoneIncoming,  label: "Inbound",  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  outbound: { icon: PhoneOutgoing,  label: "Outbound", color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
};

const STATUS_CONFIG: Record<CallStatus, { label: string; color: string; bg: string }> = {
  completed: { label: "Completed", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  missed:    { label: "Missed",    color: "text-red-700",     bg: "bg-red-50 border-red-200" },
  failed:    { label: "Failed",    color: "text-red-700",     bg: "bg-red-50 border-red-200" },
  ringing:   { label: "Ringing",   color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
  active:    { label: "Active",    color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  on_hold:   { label: "On Hold",   color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
};

type FilterDir    = "all" | CallDirection;
type FilterStatus = "all" | "completed" | "missed";

export default function CallLogPage() {
  const { callLog, setView, setDialInput } = useCallStore();

  const [search,    setSearch]    = useState("");
  const [filterDir, setFilterDir] = useState<FilterDir>("all");
  const [filterSt,  setFilterSt]  = useState<FilterStatus>("all");

  const filtered = useMemo(() => {
    return callLog
      .filter((c) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          (c.respondentName?.toLowerCase().includes(q) ?? false) ||
          c.fromNumber.includes(q) ||
          c.toNumber.includes(q) ||
          (c.agentName.toLowerCase().includes(q));
        const matchDir = filterDir === "all" || c.direction === filterDir;
        const matchSt  = filterSt  === "all" || c.status  === filterSt;
        return matchSearch && matchDir && matchSt;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [callLog, search, filterDir, filterSt]);

  // Stats
  const total     = callLog.length;
  const completed = callLog.filter((c) => c.status === "completed").length;
  const missed    = callLog.filter((c) => c.status === "missed").length;
  const totalDur  = callLog.reduce((sum, c) => sum + (c.durationSeconds ?? 0), 0);
  const avgDur    = completed > 0 ? Math.round(totalDur / completed) : 0;

  const dialNumber = (num: string) => {
    setDialInput(num);
    setView("dialer");
  };

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Calls",    value: total,                  icon: PhoneCall,    color: "text-primary",    bg: "bg-primary/5" },
          { label: "Completed",      value: completed,              icon: Phone,        color: "text-emerald-600",bg: "bg-emerald-50" },
          { label: "Missed",         value: missed,                 icon: PhoneMissed,  color: "text-red-600",    bg: "bg-red-50" },
          { label: "Avg Duration",   value: fmtDuration(avgDur),    icon: Clock,        color: "text-blue-600",   bg: "bg-blue-50" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border border-border shadow-none">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} className={s.color} />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground leading-none">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, number, agent..."
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-muted-foreground" />
          {(["all", "inbound", "outbound"] as FilterDir[]).map((d) => (
            <button
              key={d}
              onClick={() => setFilterDir(d)}
              className={cn("text-xs px-3 py-1.5 rounded-full border capitalize transition-colors",
                filterDir === d ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:bg-muted")}
            >
              {d === "all" ? "All" : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
          {(["all", "completed", "missed"] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterSt(s)}
              className={cn("text-xs px-3 py-1.5 rounded-full border capitalize transition-colors",
                filterSt === s ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:bg-muted")}
            >
              {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="border border-border shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Direction</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Caller / Respondent</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Number</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Agent</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Date</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Time</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Duration</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Ticket</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-sm text-muted-foreground">
                    No call records found.
                  </td>
                </tr>
              )}
              {filtered.map((call) => {
                const dir    = DIR_CONFIG[call.direction];
                const status = STATUS_CONFIG[call.status];
                const DirIcon = dir.icon;
                const { date, time } = fmtTime(call.createdAt);
                const remoteNum = call.direction === "inbound" ? call.fromNumber : call.toNumber;

                return (
                  <tr key={call.callId} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors group">
                    {/* Direction */}
                    <td className="px-4 py-3">
                      <span className={cn("flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full border w-fit", dir.bg, dir.color)}>
                        <DirIcon size={10} />
                        {dir.label}
                      </span>
                    </td>

                    {/* Respondent */}
                    <td className="px-3 py-3">
                      {call.respondentId ? (
                        <Link href={`/dashboard/respondents/${call.respondentId}`} className="text-sm font-medium text-primary hover:underline">
                          {call.respondentName}
                        </Link>
                      ) : (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <User size={11} /> Unknown
                        </span>
                      )}
                    </td>

                    {/* Number */}
                    <td className="px-3 py-3 font-mono text-xs text-foreground">{remoteNum}</td>

                    {/* Agent */}
                    <td className="px-3 py-3 text-xs text-muted-foreground">{call.agentName}</td>

                    {/* Date */}
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{date}</td>

                    {/* Time */}
                    <td className="px-3 py-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">{time}</td>

                    {/* Duration */}
                    <td className="px-3 py-3 text-xs text-muted-foreground tabular-nums">
                      {call.status === "missed" ? (
                        <span className="text-red-500 flex items-center gap-1"><PhoneMissed size={10} /> Missed</span>
                      ) : (
                        fmtDuration(call.durationSeconds)
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", status.bg, status.color)}>
                        {status.label}
                      </span>
                    </td>

                    {/* Linked ticket */}
                    <td className="px-3 py-3">
                      {call.ticketId ? (
                        <Link href={`/dashboard/tickets/${call.ticketId}`} className="flex items-center gap-1 text-[10px] text-primary hover:underline font-mono">
                          <Ticket size={10} /> View
                        </Link>
                      ) : (
                        <Link href="/dashboard/tickets/new" className="text-[10px] text-muted-foreground hover:text-primary transition-colors">
                          + Create
                        </Link>
                      )}
                    </td>

                    {/* Callback */}
                    <td className="px-3 py-3">
                      <button
                        onClick={() => dialNumber(remoteNum)}
                        title="Call back"
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-all"
                      >
                        <Phone size={11} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
