"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, Phone, Mail, ChevronRight, ShieldOff, CalendarDays, ArrowUpDown, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useRespondents } from "@/hooks/use-firestore-respondents";
import { useLeadSources } from "@/hooks/use-firestore-config";
import { useTickets } from "@/hooks/use-firestore-tickets";
import { cn } from "@/lib/utils";
import type { Respondent } from "@/types";

// ── Sort & period types ─────────────────────────────────────────────────────
type SortMode   = "active" | "new" | "all";
type PeriodKey  = "today" | "this_week" | "this_month" | "custom";

function startOf(unit: "day" | "week" | "month"): Date {
  const d = new Date();
  if (unit === "day")   { d.setHours(0, 0, 0, 0); return d; }
  if (unit === "week")  { d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; }
  d.setDate(1); d.setHours(0, 0, 0, 0); return d; // month
}

function contactDate(r: Respondent): Date {
  return new Date(r.firstContactDate ?? r.createdAt);
}

// Last activity = updatedAt (refreshed on every new message), fallback to first contact
function activityDate(r: Respondent): Date {
  return new Date((r as any).updatedAt ?? r.firstContactDate ?? r.createdAt);
}

function inPeriod(r: Respondent, period: PeriodKey, customFrom: string, customTo: string): boolean {
  const date = contactDate(r);
  if (period === "today")      return date >= startOf("day");
  if (period === "this_week")  return date >= startOf("week");
  if (period === "this_month") return date >= startOf("month");
  if (period === "custom") {
    const from = customFrom ? new Date(customFrom) : null;
    const to   = customTo   ? new Date(customTo + "T23:59:59") : null;
    if (from && date < from) return false;
    if (to   && date > to)   return false;
    return true;
  }
  return true;
}

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today:      "Today",
  this_week:  "This Week",
  this_month: "This Month",
  custom:     "Custom",
};

// Relative time helper for "last activity" column
function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)    return "baru saja";
  if (mins < 60)   return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24)  return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7)    return `${days} hari lalu`;
  const weeks = Math.floor(days / 7);
  if (days < 30)   return `${weeks} minggu lalu`;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Component ────────────────────────────────────────────────────────────────
export default function RespondentsPage() {
  const { respondents: allRespondents, loading: respLoading } = useRespondents(true);
  const { items: leadSources, loading: lsLoading } = useLeadSources();
  const { tickets, loading: ticketsLoading } = useTickets();

  const [search,           setSearch]           = useState("");
  const [leadSourceFilter, setLeadSourceFilter] = useState("all");
  const [showBlocked,      setShowBlocked]       = useState(false);

  // Sort & period — DEFAULT to "active" so recently-contacted respondents surface first
  const [sortMode,    setSortMode]    = useState<SortMode>("active");
  const [period,      setPeriod]      = useState<PeriodKey>("this_month");
  const [showPeriod,  setShowPeriod]  = useState(false);
  const [customFrom,  setCustomFrom]  = useState("");
  const [customTo,    setCustomTo]    = useState("");

  const getLeadSourceName = (id: string) =>
    leadSources.find((ls: any) => ls.id === id || ls.leadSourceId === id)?.name ?? "—";

  if (respLoading || lsLoading || ticketsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading respondents...</p>
        </div>
      </div>
    );
  }

  const ticketCountMap = tickets.reduce((acc: Record<string, number>, t) => {
    if (t.respondentId) acc[t.respondentId] = (acc[t.respondentId] ?? 0) + 1;
    return acc;
  }, {});

  const blockedCount = allRespondents.filter((r) => r.isBlocked).length;

  // ── Filter pipeline ──────────────────────────────────────────────────────
  let filtered = allRespondents.filter((r) => {
    const matchSearch =
      !search ||
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (r.phone  ?? "").includes(search) ||
      (r.email  ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.city   ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.problemCategories ?? []).some((c) => c.toLowerCase().includes(search.toLowerCase()));
    const matchSource  = leadSourceFilter === "all" || r.leadSourceId === leadSourceFilter;
    const matchBlocked = showBlocked ? r.isBlocked : !r.isBlocked;
    const matchPeriod  = showPeriod ? inPeriod(r, period, customFrom, customTo) : true;
    return matchSearch && matchSource && !r.isArchived && matchBlocked && matchPeriod;
  });

  // ── Sort ──────────────────────────────────────────────────────────────────
  // "active" = most recent activity first (last message / update)
  // "new"    = most recent first contact first
  // "all"    = insertion order (createdAt desc from hook)
  if (sortMode === "active") {
    filtered = [...filtered].sort((a, b) => activityDate(b).getTime() - activityDate(a).getTime());
  } else if (sortMode === "new") {
    filtered = [...filtered].sort((a, b) => contactDate(b).getTime() - contactDate(a).getTime());
  }

  const sourceCounts = allRespondents
    .filter((r) => !r.isArchived)
    .reduce((acc: Record<string, number>, r) => {
      acc[r.leadSourceId] = (acc[r.leadSourceId] ?? 0) + 1;
      return acc;
    }, {});

  const filterTabs = [
    { key: "all", label: "All", count: allRespondents.filter((r) => !r.isArchived).length },
    ...leadSources
      .filter((ls: any) => ls.isActive && (sourceCounts[ls.id] ?? sourceCounts[ls.leadSourceId] ?? 0) > 0)
      .map((ls: any) => ({ key: ls.id || ls.leadSourceId, label: ls.name, count: sourceCounts[ls.id] ?? sourceCounts[ls.leadSourceId] ?? 0 })),
  ];

  const periodLabel = PERIOD_LABELS[period];

  const SORT_LABELS: Record<SortMode, React.ReactNode> = {
    active: <span className="flex items-center gap-1"><Activity size={10} />Active</span>,
    new:    <span className="flex items-center gap-1"><ArrowUpDown size={10} />New</span>,
    all:    "All",
  };

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-base font-semibold text-foreground">Respondents</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filtered.length} respondent{filtered.length !== 1 ? "s" : ""}
            {sortMode === "active" && <span className="ml-1 text-primary font-medium">· sorted by last activity</span>}
            {showPeriod && <span className="ml-1 text-primary font-medium">· {periodLabel}{period === "custom" && customFrom ? ` ${customFrom}${customTo ? " – " + customTo : ""}` : ""}</span>}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort toggle */}
          <div className="flex items-center border border-border rounded-md overflow-hidden text-xs font-medium">
            {(["active", "new", "all"] as SortMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={cn(
                  "px-3 py-1.5 transition-colors",
                  sortMode === mode
                    ? "bg-foreground text-background"
                    : "bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                {SORT_LABELS[mode]}
              </button>
            ))}
          </div>

          {/* Period toggle */}
          <button
            onClick={() => setShowPeriod((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border transition-colors",
              showPeriod
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
            )}
          >
            <CalendarDays size={12} />
            {showPeriod ? periodLabel : "All Time"}
          </button>

          {/* Blocked toggle */}
          {blockedCount > 0 && (
            <button
              onClick={() => setShowBlocked((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border transition-colors",
                showBlocked
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-background border-border text-muted-foreground hover:border-red-300 hover:text-red-600"
              )}
            >
              <ShieldOff size={12} />
              {showBlocked ? "Tampilkan Aktif" : `Blocked (${blockedCount})`}
            </button>
          )}
        </div>
      </div>

      {/* ── Period picker ── */}
      {showPeriod && (
        <div className="flex flex-col gap-3 p-3.5 rounded-xl border border-border bg-muted/30">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  period === key
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border hover:border-foreground/30"
                )}
              >
                {PERIOD_LABELS[key]}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Dari</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 px-2.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Sampai</label>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 px-2.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              {(customFrom || customTo) && (
                <button
                  onClick={() => { setCustomFrom(""); setCustomTo(""); }}
                  className="self-end text-[10px] text-muted-foreground underline mb-1"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Search + lead source filter tabs ── */}
      <div className="flex flex-col gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setLeadSourceFilter(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                leadSourceFilter === tab.key
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/30"
              )}
            >
              {tab.label}
              <span className={cn(
                "text-[10px] px-1.5 py-px rounded-full font-semibold",
                leadSourceFilter === tab.key ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      {filtered.length > 0 ? (
        <Card className="border border-border shadow-none overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left text-[11px] font-medium text-muted-foreground px-5 py-2.5">Name</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-3 py-2.5">Phone</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-3 py-2.5">Email</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-3 py-2.5">Lead Source</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-3 py-2.5">Tickets</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-3 py-2.5">
                  <span className="flex items-center gap-1">
                    Last Activity
                    {sortMode === "active" && <Activity size={9} className="text-primary" />}
                  </span>
                </th>
                <th className="text-left text-[11px] font-medium text-muted-foreground px-3 py-2.5">
                  <span className="flex items-center gap-1">
                    First Contact
                    {sortMode === "new" && <ArrowUpDown size={9} className="text-primary" />}
                  </span>
                </th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const fcd = contactDate(r);
                const lad = activityDate(r);
                const isRecent = (Date.now() - lad.getTime()) < 24 * 60 * 60 * 1000; // within 24h
                return (
                  <tr
                    key={r.respondentId}
                    className={cn(
                      "border-b border-border last:border-0 hover:bg-muted/20 transition-colors group",
                      r.isBlocked && "bg-red-50/30"
                    )}
                  >
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/respondents/${r.respondentId}`} className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                          r.isBlocked ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
                        )}>
                          {r.isBlocked ? <ShieldOff size={12} /> : r.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-xs font-medium transition-colors flex items-center gap-1.5",
                            r.isBlocked ? "text-red-600 line-through" : "text-foreground group-hover:text-primary"
                          )}>
                            {r.fullName}
                            {isRecent && !r.isBlocked && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Aktif dalam 24 jam terakhir" />
                            )}
                          </span>
                          {r.isBlocked && (
                            <span className="text-[10px] text-red-500 font-medium">
                              Blocked — {r.blockedReason ?? "No reason given"}
                            </span>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        {r.phone
                          ? <><Phone size={10} className="text-muted-foreground/50" />{r.phone}</>
                          : <span className="italic text-muted-foreground/40">—</span>}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        {r.email
                          ? <><Mail size={10} className="text-muted-foreground/50" />{r.email}</>
                          : <span className="italic text-muted-foreground/40">—</span>}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {getLeadSourceName(r.leadSourceId)}
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold text-foreground">
                      {ticketCountMap[r.respondentId] ?? 0}
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      <span className={cn(isRecent ? "text-emerald-600 font-medium" : "text-muted-foreground")}>
                        {timeAgo(lad)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {fcd.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/dashboard/respondents/${r.respondentId}`}>
                        <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-sm text-muted-foreground">No respondents match the current filter.</p>
          <button
            onClick={() => { setSearch(""); setLeadSourceFilter("all"); setShowPeriod(false); }}
            className="text-xs text-primary underline"
          >
            Reset all filters
          </button>
        </div>
      )}
    </div>
  );
}