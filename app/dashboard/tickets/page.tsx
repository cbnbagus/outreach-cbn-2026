"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Filter, Search, ChevronRight, Download,
  CheckSquare, X, UserCheck, CheckCircle2, XCircle, Trash2,
  LayoutList, Columns, Bot, ShieldAlert, ChevronUp, ChevronDown as ChevronDownIcon,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/tickets/TicketStatusBadge";
import { KanbanBoard } from "@/components/tickets/KanbanBoard";
import { useTickets } from "@/hooks/use-firestore-tickets";
import { useRespondents } from "@/hooks/use-firestore-respondents";
import { useUsers } from "@/hooks/use-firestore-config";
import type { Ticket, TicketStatus } from "@/types";
import { cn } from "@/lib/utils";

const HOD_LABELS: Record<string, string> = {
  prayer_request:    "Prayer Request",
  counseling:        "Counseling",
  salvation_inquiry: "Wants to Know Jesus",
  grief_or_crisis:   "Grief / Crisis",
  baptism_request:   "Baptism Request",
  manual_escalation: "Manual",
};

// ── Period helpers ────────────────────────────────────────────────────────────
type Period = "all" | "today" | "this_week" | "this_month" | "custom";

function getPeriodRange(period: Period, customFrom: string, customTo: string): [Date | null, Date | null] {
  const now   = new Date();
  const start = (d: Date) => { d.setHours(0, 0, 0, 0); return d; };
  const end   = (d: Date) => { d.setHours(23, 59, 59, 999); return d; };

  if (period === "today") {
    return [start(new Date(now)), end(new Date(now))];
  }
  if (period === "this_week") {
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return [start(mon), end(new Date(now))];
  }
  if (period === "this_month") {
    return [start(new Date(now.getFullYear(), now.getMonth(), 1)), end(new Date(now))];
  }
  if (period === "custom" && customFrom && customTo) {
    return [start(new Date(customFrom)), end(new Date(customTo))];
  }
  return [null, null];
}

// ── Sort helpers ──────────────────────────────────────────────────────────────
type SortKey = "date" | "ticketNumber";
type SortDir = "asc" | "desc";

export default function TicketsPage() {
  const { tickets: firestoreTickets, loading: ticketsLoading } = useTickets();
  const { respondents, loading: respLoading } = useRespondents();
  const { items: users, loading: usersLoading } = useUsers();

  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [period, setPeriod]               = useState<Period>("all");
  const [customFrom, setCustomFrom]       = useState("");
  const [customTo, setCustomTo]           = useState("");
  const [sortKey, setSortKey]             = useState<SortKey>("date");
  const [sortDir, setSortDir]             = useState<SortDir>("desc");   // latest first by default
  const [tickets, setTickets]             = useState<Ticket[]>([]);
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction]       = useState<string>("");
  const [view, setView]                   = useState<"list" | "kanban">("list");

  // Sync Firestore tickets into local state
  useMemo(() => {
    if (firestoreTickets.length > 0) setTickets(firestoreTickets);
  }, [firestoreTickets]);

  const agents = users.filter((u: any) => u.role === "agent" && u.isActive);

  const getRespondentName = (id: string) =>
    respondents.find((r) => r.respondentId === id)?.fullName ?? "Unknown";

  // ── Toggle sort column ────────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // ── Filtered + sorted list ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const [from, to] = getPeriodRange(period, customFrom, customTo);

    return tickets
      .filter((t) => {
        const rName = getRespondentName(t.respondentId);
        const matchSearch =
          (t.ticketNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
          rName.toLowerCase().includes(search.toLowerCase()) ||
          (t.subject ?? "").toLowerCase().includes(search.toLowerCase());
        const matchStatus   = statusFilter   === "all" || t.status   === statusFilter;
        const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
        const matchPeriod   = !from || !to
          ? true
          : new Date(t.createdAt) >= from && new Date(t.createdAt) <= to;
        return matchSearch && matchStatus && matchPriority && matchPeriod;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortKey === "date") {
          diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else {
          diff = a.ticketNumber.localeCompare(b.ticketNumber);
        }
        return sortDir === "asc" ? diff : -diff;
      });
  }, [tickets, search, statusFilter, priorityFilter, period, customFrom, customTo, sortKey, sortDir]);

  // ── Selection helpers ─────────────────────────────────────────────────────
  const allSelected   = filtered.length > 0 && filtered.every((t) => selected.has(t.ticketId));
  const someSelected  = filtered.some((t) => selected.has(t.ticketId));
  const selectedCount = [...selected].filter((id) => filtered.some((t) => t.ticketId === id)).length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected((s) => { const n = new Set(s); filtered.forEach((t) => n.delete(t.ticketId)); return n; });
    } else {
      setSelected((s) => { const n = new Set(s); filtered.forEach((t) => n.add(t.ticketId)); return n; });
    }
  };
  const toggleOne = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSelection = () => setSelected(new Set());

  const applyBulkAction = () => {
    if (!bulkAction || selected.size === 0) return;
    setTickets((prev) => prev.map((t) => {
      if (!selected.has(t.ticketId)) return t;
      if (bulkAction === "close")   return { ...t, status: "closed"   as TicketStatus };
      if (bulkAction === "resolve") return { ...t, status: "resolved" as TicketStatus };
      if (bulkAction === "open")    return { ...t, status: "open"     as TicketStatus };
      if (bulkAction.startsWith("assign:")) {
        const agentId = bulkAction.replace("assign:", "");
        const agent   = agents.find((a) => a.uid === agentId);
        return { ...t, assignedAgentId: agentId, assignedAgentName: agent?.displayName ?? null };
      }
      return t;
    }));
    if (bulkAction === "delete") setTickets((prev) => prev.filter((t) => !selected.has(t.ticketId)));
    clearSelection();
    setBulkAction("");
  };

  const handleKanbanStatusChange = (ticketId: string, newStatus: TicketStatus) =>
    setTickets((prev) => prev.map((t) => t.ticketId === ticketId ? { ...t, status: newStatus } : t));

  const exportCSV = () => {
    const rows = [
      ["Ticket #", "Respondent", "Subject", "Status", "Priority", "Agent", "Date", "Time"],
      ...filtered.map((t) => {
        const d = new Date(t.createdAt);
        return [
          t.ticketNumber, getRespondentName(t.respondentId), `"${t.subject}"`,
          t.status, t.priority, t.assignedAgentName ?? "Unassigned",
          d.toLocaleDateString("id-ID"), d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        ];
      }),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "tickets.csv"; a.click();
  };

  // ── Sort indicator component ──────────────────────────────────────────────
  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="inline-flex flex-col ml-1 opacity-60">
      <ChevronUp   size={8} className={cn(sortKey === col && sortDir === "asc"  && "opacity-100 text-primary")} />
      <ChevronDownIcon size={8} className={cn(sortKey === col && sortDir === "desc" && "opacity-100 text-primary")} />
    </span>
  );

  const PERIOD_OPTS: { value: Period; label: string }[] = [
    { value: "all",        label: "All Time" },
    { value: "today",      label: "Today" },
    { value: "this_week",  label: "This Week" },
    { value: "this_month", label: "This Month" },
    { value: "custom",     label: "Custom Range" },
  ];

  if (ticketsLoading || respLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Ticket Queue</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} ticket{filtered.length !== 1 ? "s" : ""} found</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors",
                view === "list" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted")}
            >
              <LayoutList size={12} />List
            </button>
            <button
              onClick={() => setView("kanban")}
              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors",
                view === "kanban" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted")}
            >
              <Columns size={12} />Kanban
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 text-xs gap-1.5">
            <Download size={12} /> Export CSV
          </Button>

        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-4 flex flex-col gap-3">
          {/* Row 1: search + status + priority */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tickets, respondents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Filter size={13} className="text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: period filter */}
          <div className="flex flex-wrap items-center gap-2">
            <Calendar size={13} className="text-muted-foreground flex-shrink-0" />
            <div className="flex items-center gap-1.5 flex-wrap">
              {PERIOD_OPTS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    period === opt.value
                      ? "bg-primary text-white border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Custom date range inputs */}
            {period === "custom" && (
              <div className="flex items-center gap-2 ml-1">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-7 text-xs rounded-md border border-border bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-7 text-xs rounded-md border border-border bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Bulk action bar ─────────────────────────────────────────────────── */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg">
          <CheckSquare size={14} className="text-primary flex-shrink-0" />
          <span className="text-xs font-semibold text-primary">{selectedCount} ticket{selectedCount > 1 ? "s" : ""} selected</span>
          <div className="flex-1" />
          <Select value={bulkAction} onValueChange={setBulkAction}>
            <SelectTrigger className="h-7 w-48 text-xs border-primary/30">
              <SelectValue placeholder="Choose action..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open"><span className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-blue-500" />Mark as Open</span></SelectItem>
              <SelectItem value="resolve"><span className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-emerald-500" />Mark as Resolved</span></SelectItem>
              <SelectItem value="close"><span className="flex items-center gap-1.5"><XCircle size={11} className="text-slate-500" />Mark as Closed</span></SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.uid} value={`assign:${a.uid}`}>
                  <span className="flex items-center gap-1.5"><UserCheck size={11} className="text-amber-500" />Assign to {a.displayName}</span>
                </SelectItem>
              ))}
              <SelectItem value="delete"><span className="flex items-center gap-1.5 text-destructive"><Trash2 size={11} />Delete</span></SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-7 text-xs px-3" onClick={applyBulkAction} disabled={!bulkAction}>
            Apply
          </Button>
          <button onClick={clearSelection} className="p-1 rounded hover:bg-primary/10 transition-colors">
            <X size={13} className="text-muted-foreground" />
          </button>
        </div>
      )}

      {/* ── Kanban Board ────────────────────────────────────────────────────── */}
      {view === "kanban" && (
        <KanbanBoard tickets={filtered} onStatusChange={handleKanbanStatusChange} />
      )}

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      {view === "list" && (
        <Card className="border border-border shadow-none overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {/* Checkbox */}
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded cursor-pointer accent-primary"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleAll}
                  />
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-2 py-3">Ticket #</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Respondent</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Subject</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Priority</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Agent</th>

                {/* Sortable Date */}
                <th
                  className="text-left text-xs font-medium text-muted-foreground px-3 py-3 cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort("date")}
                >
                  <span className="flex items-center gap-0.5">
                    Date <SortIcon col="date" />
                  </span>
                </th>

                {/* Sortable Time (shares same key as date) */}
                <th
                  className="text-left text-xs font-medium text-muted-foreground px-3 py-3 cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort("date")}
                >
                  <span className="flex items-center gap-0.5">
                    Time <SortIcon col="date" />
                  </span>
                </th>

                {/* HoD */}
                <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">
                  <span className="flex items-center gap-1"><Bot size={10} />HoD</span>
                </th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-14 text-sm text-muted-foreground">
                    No tickets match your filters.
                  </td>
                </tr>
              )}
              {filtered.map((ticket) => {
                const isSelected  = selected.has(ticket.ticketId);
                const isNew       = (ticket as any).hasUnread === true;
                const isHoD       = ticket.handledBy === "escalated" && ticket.escalation;
                const createdDate = new Date(ticket.createdAt);
                const lastMsg     = (ticket as any).lastMessage ?? "";
                const lastMsgSender = (ticket as any).lastMessageSender ?? "";

                return (
                  <tr
                    key={ticket.ticketId}
                    className={cn(
                      "border-b border-border last:border-0 hover:bg-muted/20 transition-colors group",
                      isSelected && "bg-primary/5",
                      isNew && "border-l-2 border-l-blue-400 bg-blue-50/30"
                    )}
                  >
                    {/* Checkbox */}
                    <td className="w-10 px-4 py-3">
                      <input type="checkbox" className="w-3.5 h-3.5 rounded cursor-pointer accent-primary"
                        checked={isSelected} onChange={() => toggleOne(ticket.ticketId)} />
                    </td>

                    {/* Ticket # + New badge */}
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/dashboard/tickets/${ticket.ticketId}`}
                          className="text-primary font-mono text-xs font-semibold hover:underline whitespace-nowrap"
                        >
                          {ticket.ticketNumber}
                        </Link>
                        {isNew && (
                          <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-blue-500 text-white leading-none animate-pulse">
                            New
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Respondent */}
                    <td className="px-3 py-3 text-sm font-medium text-foreground whitespace-nowrap">
                      {getRespondentName(ticket.respondentId)}
                    </td>

                    {/* Subject + Last Message */}
                    <td className="px-3 py-3 max-w-[220px]">
                      <p className="text-xs text-foreground truncate font-medium">{ticket.subject}</p>
                      {lastMsg && lastMsg !== ticket.subject && (
                        <p className={cn(
                          "text-[10px] truncate mt-0.5",
                          isNew ? "text-blue-600 font-semibold" : "text-muted-foreground"
                        )}>
                          {lastMsgSender ? `${lastMsgSender}: ` : ""}{lastMsg}
                        </p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3"><TicketStatusBadge status={ticket.status} /></td>

                    {/* Priority */}
                    <td className="px-3 py-3"><TicketPriorityBadge priority={ticket.priority} /></td>

                    {/* Agent */}
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {ticket.assignedAgentName ?? <span className="italic text-muted-foreground/40">Unassigned</span>}
                    </td>

                    {/* Date */}
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {createdDate.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>

                    {/* Time */}
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {createdDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </td>

                    {/* HoD */}
                    <td className="px-3 py-3">
                      {isHoD ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 whitespace-nowrap">
                          <ShieldAlert size={9} />
                          {HOD_LABELS[ticket.escalation!.reason] ?? "Escalated"}
                        </span>
                      ) : ticket.aiMessageCount && ticket.aiMessageCount > 0 ? (
                        <span className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                          <Bot size={9} />AI
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* Arrow */}
                    <td className="px-3 py-3">
                      <Link href={`/dashboard/tickets/${ticket.ticketId}`}>
                        <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
