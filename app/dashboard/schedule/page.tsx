"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, User, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/tickets/TicketStatusBadge";
import { useTickets } from "@/hooks/use-firestore-tickets";
import { useRespondents } from "@/hooks/use-firestore-respondents";
import { cn } from "@/lib/utils";
import type { Ticket as TicketType } from "@/types";

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const TYPE_STYLES = {
  new:       { label: "New",       bg: "bg-blue-50   border-blue-200",    text: "text-blue-700",    dot: "bg-blue-500"    },
  follow_up: { label: "Follow-up", bg: "bg-amber-50  border-amber-200",   text: "text-amber-700",   dot: "bg-amber-500"   },
  review:    { label: "Review",    bg: "bg-slate-50  border-slate-200",   text: "text-slate-600",   dot: "bg-slate-400"   },
};

export default function SchedulePage() {
  const { tickets, loading: tLoading } = useTickets();
  const { respondents, loading: rLoading } = useRespondents();

  const today = new Date();
  const [viewDate, setViewDate]       = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().slice(0, 10));

  // Build schedule items from real Firestore tickets
  const SCHEDULE = useMemo(() => {
    const items: { date: string; ticket: TicketType; respondentName: string; type: "follow_up" | "new" | "review" }[] = [];
    tickets.forEach((t, i) => {
      const base = new Date(t.createdAt);
      if (isNaN(base.getTime())) return;
      const resp = respondents.find((r) => r.respondentId === t.respondentId);
      // Primary entry on created date
      items.push({
        date: base.toISOString().slice(0, 10),
        ticket: t,
        respondentName: t.respondentName ?? resp?.fullName ?? "Unknown",
        type: "new",
      });
      // Follow-up 5 days later for in_progress or resolved tickets
      if (["in_progress", "resolved"].includes(t.status)) {
        const fu = new Date(base);
        fu.setDate(fu.getDate() + 5 + i);
        items.push({
          date: fu.toISOString().slice(0, 10),
          ticket: t,
          respondentName: t.respondentName ?? resp?.fullName ?? "Unknown",
          type: "follow_up",
        });
      }
    });
    return items;
  }, [tickets, respondents]);

  const loading = tLoading || rLoading;

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay  = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    return grid;
  }, [year, month]);

  const dateStr = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const itemsForDate = (d: string) => SCHEDULE.filter((s) => s.date === d);
  const selectedItems = itemsForDate(selectedDate);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const goToday   = () => { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(today.toISOString().slice(0, 10)); };

  const formatSelectedDate = (s: string) => {
    const d = new Date(s + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
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
          <p className="text-xs text-muted-foreground mt-0.5">Follow-up and ticket schedule calendar</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
          Today
        </Button>
      </div>

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
                  const hasItems = itemsForDate(ds).length > 0;

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
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 pt-4 border-t border-border flex flex-col gap-1.5">
                {Object.entries(TYPE_STYLES).map(([key, s]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", s.dot)} />
                    <span className="text-[10px] text-muted-foreground">{s.label}</span>
                  </div>
                ))}
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
                    {selectedItems.length === 0 ? "No items scheduled" : `${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""} scheduled`}
                  </p>
                </div>
              </div>

              {/* Agenda items */}
              {selectedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <CalendarDays size={16} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No items for this date.</p>
                  <p className="text-xs text-muted-foreground/60">Select another date or check upcoming follow-ups.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {selectedItems.map((item, i) => {
                    const s = TYPE_STYLES[item.type];
                    return (
                      <div key={`${item.ticket.ticketId}-${i}`} className="flex gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                        {/* Type indicator */}
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                          <div className={cn("w-2.5 h-2.5 rounded-full mt-1", s.dot)} />
                          <div className="w-px flex-1 bg-border" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border", s.bg, s.text)}>
                                  {s.label}
                                </span>
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

                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <User size={11} />{item.respondentName}
                            </span>
                            {item.ticket.assignedAgentName && (
                              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <Ticket size={11} />Agent: {item.ticket.assignedAgentName}
                              </span>
                            )}
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
