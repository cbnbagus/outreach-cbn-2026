"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Users, Ticket, Clock, ShieldAlert, Moon, Sun, Sunset } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PresenceDot, STATUS_LABEL, STATUS_COLOR } from "@/components/presence/PresenceDot";
import { usePresenceStore } from "@/store/presence-store";
import { useAuthStore } from "@/store/auth-store";
import { useUsers } from "@/hooks/use-firestore-config";
import { useTickets } from "@/hooks/use-firestore-tickets";
import { cn } from "@/lib/utils";
import type { OnlineStatus, ShiftName } from "@/types";

const SHIFT_ICON: Record<ShiftName, React.ElementType> = {
  Morning:   Sun,
  Afternoon: Sunset,
  Night:     Moon,
  Off:       Clock,
};

const SHIFT_COLOR: Record<ShiftName, string> = {
  Morning:   "text-amber-500",
  Afternoon: "text-orange-500",
  Night:     "text-indigo-500",
  Off:       "text-slate-400",
};

const STATUS_ORDER: Record<OnlineStatus, number> = {
  online: 0, busy: 1, away: 2, offline: 3,
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function TeamPage() {
  const { currentUser, role } = useAuthStore();
  const { getAllPresence, getPresence, setStatus, initialized, init } = usePresenceStore();
  const { items: allUsers, loading: usersLoading } = useUsers();
  const { tickets, loading: ticketsLoading } = useTickets();

  useEffect(() => {
    if (currentUser?.uid) init(currentUser.uid);
  }, [currentUser?.uid]);

  const allPresence = initialized ? getAllPresence() : [];

  if (usersLoading || ticketsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading team...</p>
        </div>
      </div>
    );
  }

  // Merge user + presence data, sorted by status then name
  const members = allUsers
    .map((u: any) => ({ user: u, presence: getPresence(u.uid || u.id) ?? allPresence.find((p) => p.uid === (u.uid || u.id)) }))
    .sort((a, b) => {
      const sa = STATUS_ORDER[a.presence?.status ?? "offline"];
      const sb = STATUS_ORDER[b.presence?.status ?? "offline"];
      if (sa !== sb) return sa - sb;
      return a.user.displayName.localeCompare(b.user.displayName);
    });

  const onlineCount  = members.filter((m) => m.presence?.status === "online").length;
  const busyCount    = members.filter((m) => m.presence?.status === "busy").length;
  const awayCount    = members.filter((m) => m.presence?.status === "away").length;
  const offlineCount = members.filter((m) => m.presence?.status === "offline").length;

  const shiftGroups = (["Morning", "Afternoon", "Night"] as ShiftName[]).map((s) => ({
    shift:   s,
    members: members.filter((m) => m.presence?.shift === s),
    online:  members.filter((m) => m.presence?.shift === s && (m.presence.status === "online" || m.presence.status === "busy")).length,
  }));

  const isAdminOrSPV = role === "admin" || role === "supervisor";

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Team Overview</h2>
          <p className="text-sm text-muted-foreground">Real-time agent status across all shifts</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Online",  value: onlineCount,  color: "bg-emerald-50 border-emerald-200 text-emerald-700", dot: "bg-emerald-500" },
          { label: "Busy",    value: busyCount,    color: "bg-rose-50 border-rose-200 text-rose-700",          dot: "bg-rose-500" },
          { label: "Away",    value: awayCount,    color: "bg-amber-50 border-amber-200 text-amber-700",       dot: "bg-amber-400" },
          { label: "Offline", value: offlineCount, color: "bg-muted border-border text-muted-foreground",      dot: "bg-slate-400" },
        ].map((s) => (
          <div key={s.label} className={cn("flex items-center gap-3 p-4 rounded-xl border", s.color)}>
            <span className={cn("w-3 h-3 rounded-full flex-shrink-0", s.dot)} />
            <div>
              <p className="text-2xl font-bold leading-none">{s.value}</p>
              <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Shift summary cards */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">By Shift</h3>
          {shiftGroups.map(({ shift, members: sm, online }) => {
            const Icon = SHIFT_ICON[shift];
            return (
              <Card key={shift} className="border border-border shadow-none">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className={SHIFT_COLOR[shift]} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{shift} Shift</p>
                    <p className="text-[11px] text-muted-foreground">{sm.length} assigned</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-foreground">{online}</p>
                    <p className="text-[10px] text-muted-foreground">active</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main team table */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">All Team Members</h3>
          <Card className="border border-border shadow-none overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-[11px] font-semibold text-muted-foreground px-4 py-2.5">Agent</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground px-3 py-2.5">Status</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground px-3 py-2.5">Shift</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground px-3 py-2.5 hidden sm:table-cell">Active Tickets</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground px-3 py-2.5 hidden md:table-cell">Last Seen</th>
                  {isAdminOrSPV && (
                    <th className="text-left text-[11px] font-semibold text-muted-foreground px-3 py-2.5">Action</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {members.map(({ user, presence }) => {
                  const status     = presence?.status ?? "offline";
                  const shift      = presence?.shift  ?? "Off";
                  const ShiftIcon  = SHIFT_ICON[shift];
                  const isMe       = user.uid === currentUser?.uid;
                  const activeCount = tickets.filter(
                    (t) => t.assignedAgentId === user.uid && (t.status === "open" || t.status === "in_progress")
                  ).length;

                  return (
                    <tr
                      key={user.uid}
                      className={cn(
                        "border-b border-border last:border-0 transition-colors",
                        isMe ? "bg-primary/5" : "hover:bg-muted/20"
                      )}
                    >
                      {/* Agent */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="relative flex-shrink-0">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                              isMe ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                            )}>
                              {user.avatarInitials ?? user.displayName.charAt(0)}
                            </div>
                            <PresenceDot
                              status={status}
                              size="sm"
                              className="absolute -bottom-0.5 -right-0.5"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {user.displayName}
                              {isMe && <span className="ml-1.5 text-[9px] text-primary font-medium">(you)</span>}
                            </p>
                            <p className="text-[10px] text-muted-foreground capitalize">{user.role}</p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        <span className={cn(
                          "flex items-center gap-1.5 text-[11px] font-medium w-fit px-2 py-0.5 rounded-full border",
                          status === "online"  && "bg-emerald-50 border-emerald-200 text-emerald-700",
                          status === "busy"    && "bg-rose-50 border-rose-200 text-rose-700",
                          status === "away"    && "bg-amber-50 border-amber-200 text-amber-700",
                          status === "offline" && "bg-muted border-border text-muted-foreground",
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_COLOR[status])} />
                          {STATUS_LABEL[status]}
                        </span>
                        {presence?.note && (
                          <p className="text-[9px] text-muted-foreground mt-0.5 italic">{presence.note}</p>
                        )}
                      </td>

                      {/* Shift */}
                      <td className="px-3 py-3">
                        <span className={cn("flex items-center gap-1 text-[11px] font-medium", SHIFT_COLOR[shift])}>
                          <ShiftIcon size={11} />
                          {shift}
                        </span>
                      </td>

                      {/* Active Tickets */}
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <span className={cn(
                          "flex items-center gap-1 text-[11px] font-semibold",
                          activeCount > 3 ? "text-rose-600" : activeCount > 0 ? "text-foreground" : "text-muted-foreground/40"
                        )}>
                          {activeCount > 0 && <Ticket size={10} />}
                          {activeCount > 0 ? activeCount : "—"}
                        </span>
                      </td>

                      {/* Last seen */}
                      <td className="px-3 py-3 text-[11px] text-muted-foreground hidden md:table-cell whitespace-nowrap">
                        {status !== "offline" ? (
                          <span className="text-emerald-600 font-medium">Active now</span>
                        ) : (
                          presence?.lastSeen ? timeAgo(presence.lastSeen) : "—"
                        )}
                      </td>

                      {/* SPV/Admin action */}
                      {isAdminOrSPV && (
                        <td className="px-3 py-3">
                          {isMe ? (
                            <span className="text-[10px] text-muted-foreground/40">—</span>
                          ) : (
                            <div className="flex gap-1">
                              {(["online","busy","away","offline"] as OnlineStatus[]).map((s) => (
                                <button
                                  key={s}
                                  title={`Set ${STATUS_LABEL[s]}`}
                                  onClick={() => setStatus(user.uid, s)}
                                  className={cn(
                                    "w-3.5 h-3.5 rounded-full border-2 transition-opacity hover:opacity-80",
                                    STATUS_COLOR[s],
                                    status === s ? "border-foreground opacity-100 scale-110" : "border-transparent opacity-40"
                                  )}
                                />
                              ))}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      {/* HoD queue for SPV/Admin — tickets needing human attention */}
      {isAdminOrSPV && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Human on Demand Queue
          </h3>
          <Card className="border border-border shadow-none overflow-hidden">
            <CardContent className="p-0">
              {(() => {
                const hodTickets = tickets.filter((t) => t.handledBy === "escalated" && t.escalation);
                if (hodTickets.length === 0) return (
                  <p className="text-sm text-muted-foreground text-center py-8">No escalated tickets right now.</p>
                );
                return (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left text-[11px] font-semibold text-muted-foreground px-4 py-2.5">Ticket</th>
                        <th className="text-left text-[11px] font-semibold text-muted-foreground px-3 py-2.5">Respondent</th>
                        <th className="text-left text-[11px] font-semibold text-muted-foreground px-3 py-2.5">Reason</th>
                        <th className="text-left text-[11px] font-semibold text-muted-foreground px-3 py-2.5">Assigned</th>
                        <th className="px-3 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {hodTickets.map((t) => (
                        <tr key={t.ticketId} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs font-semibold text-primary">{t.ticketNumber}</span>
                          </td>
                          <td className="px-3 py-3 text-xs text-foreground">{t.respondentName}</td>
                          <td className="px-3 py-3">
                            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 w-fit rounded-full bg-orange-50 border border-orange-200 text-orange-700">
                              <ShieldAlert size={9} />
                              {t.escalation?.label}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">
                            {t.assignedAgentName ?? <span className="italic opacity-50">Unassigned</span>}
                          </td>
                          <td className="px-3 py-3">
                            <Link
                              href={`/dashboard/tickets/${t.ticketId}`}
                              className="text-[11px] font-medium text-primary hover:underline"
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
