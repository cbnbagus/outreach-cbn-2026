"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, CalendarDays, User, Ticket,
  Phone, MessageSquare, Mail, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/tickets/TicketStatusBadge";
import { useTickets } from "@/hooks/use-firestore-tickets";
import { useRespondents } from "@/hooks/use-firestore-respondents";
import { useUsers } from "@/hooks/use-firestore-config";
import { cn } from "@/lib/utils";
import type { Ticket as TicketType } from "@/types";

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  whatsapp:     { label: "WhatsApp",     icon: <MessageSquare size={10} />, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  call:         { label: "Call",          icon: <Phone size={10} />,         color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  instagram_dm: { label: "Instagram DM",  icon: <MessageSquare size={10} />, color: "text-pink-700",    bg: "bg-pink-50 border-pink-200" },
  facebook_dm:  { label: "Facebook DM",   icon: <MessageSquare size={10} />, color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  email:        { label: "Email",         icon: <Mail size={10} />,          color: "text-cyan-700",    bg: "bg-cyan-50 border-cyan-200" },
  tiktok_dm:    { label: "TikTok DM",     icon: <MessageSquare size={10} />, color: "text-gray-700",    bg: "bg-gray-50 border-gray-200" },
};

type ScheduleItem = {
  ticket: TicketType;
  respondentName: string;
  respondentPhone?: string;
  respondentEmail?: string;
  agentName: string;
  channel: string;
  note: string;
  scheduledAt: Date;
};

export default function SchedulePage() {
  const { tickets, loading: tLoading } = useTickets();
  const { respondents, loading: rLoading } = useRespondents();
  const { items: users, loading: uLoading } = useUsers();

  const today = new Date();
  const [viewDate, setViewDate]       = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().slice(0, 10));

  const loading = tLoading || rLoading || uLoading;

  // Build schedule items from tickets that have scheduledAt
  const SCHEDULE = useMemo(() => {
    const items: ScheduleItem[] = [];
    tickets.forEach((t) => {
      if (!t.scheduledAt) return;
      const d = new Date(t.scheduledAt);
      if (isNaN(d.getTime())) return;

      const resp = respondents.find((r) => r.respondentId === t.respondentId);
      const agent = users.find((u: any) => u.uid === t.assignedAgentId);

      items.push({
        ticket: t,
        respondentName: t.respondentName ?? resp?.fullName ?? "Unknown",
        respondentPhone: resp?.phone ?? undefined,
        respondentEmail: resp?.email ?? undefined,
        agentName: (agent as any)?.displayName ?? t.assignedAgentName ?? "Unassigned",
        channel: t.followUpChannel ?? "whatsapp",
        note: t.followUpNote ?? "",
        scheduledAt: d,
      });
    });
    items.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    return items;
  }, [tickets, respondents, users]);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay  = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    return grid;
  }, [year, month]);

  const dateStr = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const itemsForDate = (ds: string) =>
    SCHEDULE.filter((s) => s.scheduledAt.toISOString().slice(0, 10) === ds);

  const selectedItems = itemsForDate(selectedDate);

  const overdueItems = useMemo(() => {
    const now = new Date();
    return SCHEDULE.filter((s) => s.scheduledAt < now && !["resolved", "closed"].includes(s.ticket.status));
  }, [SCHEDULE]);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const goToday   = () => { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(today.toISOString().slice(0, 10)); };

  const formatSelectedDate = (s: string) => {
    const d = new Date(s + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  const launchChannel = (item: ScheduleItem) => {
    const ch = item.channel;
    if (ch === "whatsapp" && item.respondentPhone) {
      const num = item.respondentPhone.replace(/[^0-9]/g, "");
      window.open(`https://wa.me/${num}`, "_blank");
    } else if (ch === "call" && item.respondentPhone) {
      window.open(`tel:${item.respondentPhone}`, "_self");
    } else if (ch === "email" && item.respondentEmail) {
      window.open(`mailto:${item.respondentEmail}`, "_blank");
    } else if (ch === "instagram_dm") {
      window.open("https://www.instagram.com/direct/inbox/", "_blank");
    } else if (ch === "facebook_dm") {
      window.open("https://www.facebook.com/messages/", "_blank");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Schedule</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Follow-up schedule — {SCHEDULE.length} total
            {overdueItems.length > 0 && (
              <span className="ml-1 font-medium text-red-600">{overdueItems.length} overdue</span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
          Today
        </Button>
      </div>

      {/* Overdue banner */}
      {overdueItems.length > 0 && (
        <Card className="border-red-200 bg-red-50/50 shadow-none">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-red-700 mb-2">⚠ Overdue Follow-ups ({overdueItems.length})</p>
            <div className="flex flex-col gap-2">
              {overdueItems.slice(0, 3).map((item) => {
                const chConf = CHANNEL_CONFIG[item.channel];
                return (
                  <div key={item.ticket.ticketId} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white border border-red-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <Link
                        href={`/dashboard/tickets/${item.ticket.ticketId}`}
                        className="text-[10px] font-mono text-red-700 hover:underline flex-shrink-0"
                      >
                        {item.ticket.ticketNumber}
                      </Link>
                      <span className="text-xs font-medium text-foreground truncate">{item.respondentName}</span>
                      {chConf && (
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border flex items-center gap-1 flex-shrink-0", chConf.color, chConf.bg)}>
                          {chConf.icon}{chConf.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-red-600">
                        {item.scheduledAt.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      </span>
                      <button
                        onClick={() => launchChannel(item)}
                        className="px-2 py-1 rounded-md bg-red-600 text-white text-[10px] font-medium hover:bg-red-700 transition-colors"
                      >
                        Contact
                      </button>
                    </div>
                  </div>
                );
              })}
              {overdueItems.length > 3 && (
                <p className="text-[10px] text-red-600 text-center">+{overdueItems.length - 3} more overdue</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-5 flex-col lg:flex-row">
        {/* Calendar */}
        <div className="shrink-0 lg:w-80">
          <Card className="border border-border shadow-none">
            <CardContent className="p-4">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-1 rounded hover:bg-muted transition-colors">
                  <ChevronLeft size={16} className="text-muted-foreground" />
                </button>
                <span className="text-sm font-semibold text-foreground">
                  {MONTHS[month]} {year}
                </span>
                <button onClick={nextMonth} className="p-1 rounded hover:bg-muted transition-colors">
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map((d) => (
                  <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {calendarDays.map((d, i) => {
                  if (!d) return <div key={`empty-${i}`} />;
                  const ds       = dateStr(d);
                  const isToday  = ds === today.toISOString().slice(0, 10);
                  const isSelected = ds === selectedDate;
                  const dayItems = itemsForDate(ds);
                  const hasItems = dayItems.length > 0;
                  const hasOverdue = dayItems.some((it) => it.scheduledAt < new Date() && !["resolved", "closed"].includes(it.ticket.status));

                  return (
                    <button
                      key={ds}
                      onClick={() => setSelectedDate(ds)}
                      className={cn(
                        "relative flex flex-col items-center justify-center h-8 w-full rounded-md text-xs transition-colors",
                        isSelected  ? "bg-primary text-white font-semibold"
                          : isToday ? "bg-primary/10 text-primary font-semibold"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      {d}
                      {hasItems && !isSelected && (
                        <span className={cn(
                          "absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                          hasOverdue ? "bg-red-500" : "bg-primary"
                        )} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 pt-4 border-t border-border flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span className="text-[10px] text-muted-foreground">Scheduled follow-up</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span className="text-[10px] text-muted-foreground">Overdue</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agenda panel */}
        <div className="flex-1 min-w-0">
          <Card className="border border-border shadow-none">
            <CardContent className="p-0">
              {/* Agenda header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                <CalendarDays size={15} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{formatSelectedDate(selectedDate)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedItems.length === 0 ? "No follow-ups scheduled" : `${selectedItems.length} follow-up${selectedItems.length > 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>

              {/* Agenda items */}
              {selectedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <CalendarDays size={16} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No follow-ups for this date.</p>
                  <p className="text-xs text-muted-foreground/60">Schedule follow-ups from the ticket detail page.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {selectedItems.map((item, i) => {
                    const chConf = CHANNEL_CONFIG[item.channel] ?? CHANNEL_CONFIG.whatsapp;
                    const isPast = item.scheduledAt < new Date() && !["resolved", "closed"].includes(item.ticket.status);

                    return (
                      <div key={`${item.ticket.ticketId}-${i}`} className={cn("flex gap-4 px-5 py-4 hover:bg-muted/20 transition-colors", isPast && "bg-red-50/30")}>
                        {/* Time indicator */}
                        <div className="flex flex-col items-center gap-1 shrink-0 w-12">
                          <span className={cn("text-xs font-bold", isPast ? "text-red-600" : "text-foreground")}>
                            {item.scheduledAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full border", chConf.color, chConf.bg)}>
                            {chConf.label.split(" ")[0]}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                {isPast && (
                                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">Overdue</span>
                                )}
                                <TicketStatusBadge status={item.ticket.status} />
                                <TicketPriorityBadge priority={item.ticket.priority} />
                              </div>
                              <Link
                                href={`/dashboard/tickets/${item.ticket.ticketId}`}
                                className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
                              >
                                {item.ticket.subject}
                              </Link>
                            </div>
                            <Link
                              href={`/dashboard/tickets/${item.ticket.ticketId}`}
                              className="text-[10px] font-mono text-primary hover:underline shrink-0"
                            >
                              {item.ticket.ticketNumber}
                            </Link>
                          </div>

                          {/* Respondent info */}
                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            <span className="flex items-center gap-1.5 text-[11px] text-foreground font-medium">
                              <User size={11} className="text-muted-foreground" />{item.respondentName}
                            </span>
                            {item.respondentPhone && (
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Phone size={10} />{item.respondentPhone}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Ticket size={10} />Agent: {item.agentName}
                            </span>
                          </div>

                          {/* Note */}
                          {item.note && (
                            <p className="text-[10px] text-muted-foreground bg-muted/50 rounded-md p-2 mt-2 leading-relaxed">
                              {item.note}
                            </p>
                          )}

                          {/* Action buttons */}
                          <div className="flex gap-2 mt-2.5">
                            <button
                              onClick={() => launchChannel(item)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white text-[10px] font-semibold hover:bg-primary/90 transition-colors"
                            >
                              {chConf.icon}Contact via {chConf.label}
                            </button>
                            <Link
                              href={`/dashboard/tickets/${item.ticket.ticketId}`}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors"
                            >
                              <ExternalLink size={9} />Open Ticket
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming 7 days summary */}
          <div className="mt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Upcoming 7 days</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {Array.from({ length: 7 }, (_, i) => {
                const d   = new Date(today);
                d.setDate(today.getDate() + i);
                const ds  = d.toISOString().slice(0, 10);
                const cnt = itemsForDate(ds).length;
                const isToday = i === 0;
                return (
                  <button
                    key={ds}
                    onClick={() => setSelectedDate(ds)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border shrink-0 min-w-[56px] transition-colors",
                      selectedDate === ds
                        ? "bg-primary border-primary text-white"
                        : isToday
                        ? "bg-primary/5 border-primary/20 text-primary"
                        : "bg-card border-border text-foreground hover:border-primary/30"
                    )}
                  >
                    <span className={cn("text-[9px] font-semibold uppercase", selectedDate === ds ? "text-white/80" : "text-muted-foreground")}>
                      {DAYS[d.getDay()]}
                    </span>
                    <span className="text-base font-bold leading-none">{d.getDate()}</span>
                    <span className={cn(
                      "text-[9px] font-semibold",
                      cnt > 0
                        ? (selectedDate === ds ? "text-white/80" : "text-primary")
                        : (selectedDate === ds ? "text-white/40" : "text-muted-foreground/40")
                    )}>
                      {cnt > 0 ? `${cnt} item${cnt > 1 ? "s" : ""}` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
