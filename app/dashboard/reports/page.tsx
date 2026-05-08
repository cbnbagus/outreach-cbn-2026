"use client";
import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTickets } from "@/hooks/use-firestore-tickets";
import { useRespondents } from "@/hooks/use-firestore-respondents";
import { useUsers, useCategories, useLeadSources, useOutcomes } from "@/hooks/use-firestore-config";
import {
  TrendingUp, Users, CheckCircle2, Clock, Download, FileSpreadsheet,
  GripVertical, X, Plus, Filter, CalendarDays, BarChart2, UserCheck,
  Table2, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Column definitions ──
interface ColumnDef {
  id: string;
  label: string;
  group: "respondent" | "ticket" | "meta";
  getValue: (row: any) => string;
}

const ALL_COLUMNS: ColumnDef[] = [
  // Respondent fields
  { id: "respondentName", label: "Respondent Name", group: "respondent", getValue: (r) => r.respondentName ?? "—" },
  { id: "phone", label: "Phone", group: "respondent", getValue: (r) => r.phone ?? "—" },
  { id: "email", label: "Email", group: "respondent", getValue: (r) => r.email ?? "—" },
  { id: "city", label: "City", group: "respondent", getValue: (r) => r.city ?? "—" },
  { id: "age", label: "Age", group: "respondent", getValue: (r) => r.age?.toString() ?? "—" },
  { id: "progress", label: "Progress", group: "respondent", getValue: (r) => r.progress ?? "—" },
  { id: "programSource", label: "Program Source", group: "respondent", getValue: (r) => r.programSource ?? "—" },
  { id: "problemCategories", label: "Problem Categories", group: "respondent", getValue: (r) => (r.problemCategories ?? []).join(", ") || "—" },
  // Ticket fields
  { id: "ticketNumber", label: "Ticket #", group: "ticket", getValue: (r) => r.ticketNumber ?? "—" },
  { id: "subject", label: "Subject", group: "ticket", getValue: (r) => r.subject ?? "—" },
  { id: "status", label: "Status", group: "ticket", getValue: (r) => r.status ?? "—" },
  { id: "priority", label: "Priority", group: "ticket", getValue: (r) => r.priority ?? "—" },
  { id: "categoryName", label: "Category", group: "ticket", getValue: (r) => r.categoryName ?? "—" },
  { id: "outcomeName", label: "Outcome", group: "ticket", getValue: (r) => r.outcomeName ?? "—" },
  { id: "agentName", label: "Agent", group: "ticket", getValue: (r) => r.assignedAgentName ?? "Unassigned" },
  { id: "leadSourceName", label: "Lead Source", group: "ticket", getValue: (r) => r.leadSourceName ?? "—" },
  { id: "createdAt", label: "Date", group: "meta", getValue: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString("id-ID") : "—" },
  { id: "direction", label: "Direction", group: "ticket", getValue: (r) => r.direction ?? "inbound" },
];

const DEFAULT_SELECTED = ["ticketNumber", "respondentName", "subject", "status", "priority", "categoryName", "agentName", "createdAt"];

const OUTCOME_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
const STATUS_COLORS: Record<string, string> = { open: "#6366f1", in_progress: "#f59e0b", resolved: "#22c55e", closed: "#94a3b8" };

type Tab = "overview" | "custom" | "agents";

export default function ReportsPage() {
  const { tickets, loading: tLoading } = useTickets();
  const { respondents, loading: rLoading } = useRespondents();
  const { items: users } = useUsers();
  const { items: categories } = useCategories();
  const { items: leadSources } = useLeadSources();
  const { items: outcomes } = useOutcomes();

  const [tab, setTab] = useState<Tab>("overview");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_SELECTED);
  const [draggedCol, setDraggedCol] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterAgent, setFilterAgent] = useState("all");
  const [filterProblemCat, setFilterProblemCat] = useState("all");

  const loading = tLoading || rLoading;

  // ── Build joined data (ticket + respondent) ──
  const joinedData = useMemo(() => {
    return tickets.map((t) => {
      const resp = respondents.find((r) => r.respondentId === t.respondentId);
      const ls = leadSources.find((l: any) => l.id === t.leadSourceId || l.leadSourceId === t.leadSourceId);
      return {
        ...t,
        respondentName: t.respondentName ?? resp?.fullName ?? "—",
        phone: resp?.phone ?? "",
        email: resp?.email ?? "",
        city: resp?.city ?? "",
        age: resp?.age,
        progress: resp?.progress ?? "",
        programSource: resp?.programSource ?? "",
        problemCategories: resp?.problemCategories ?? [],
        leadSourceName: ls?.name ?? "—",
      };
    });
  }, [tickets, respondents, leadSources]);

  // ── Apply filters ──
  const filteredData = useMemo(() => {
    return joinedData.filter((row) => {
      // Date range
      if (dateFrom) {
        const d = new Date(row.createdAt);
        if (d < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const d = new Date(row.createdAt);
        const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      // Status
      if (filterStatus !== "all" && row.status !== filterStatus) return false;
      // Category
      if (filterCategory !== "all" && row.categoryId !== filterCategory) return false;
      // Agent
      if (filterAgent !== "all" && row.assignedAgentId !== filterAgent) return false;
      // Problem category dropdown
      if (filterProblemCat !== "all") {
        const cats = (row.problemCategories ?? []) as string[];
        if (!cats.some((c) => c === filterProblemCat)) return false;
      }
      return true;
    });
  }, [joinedData, dateFrom, dateTo, filterStatus, filterCategory, filterAgent, filterProblemCat]);

  // ── Column drag & drop ──
  const addColumn = (colId: string) => {
    if (!selectedColumns.includes(colId)) {
      setSelectedColumns((prev) => [...prev, colId]);
    }
  };
  const removeColumn = (colId: string) => {
    setSelectedColumns((prev) => prev.filter((c) => c !== colId));
  };
  const moveColumn = (fromIdx: number, toIdx: number) => {
    setSelectedColumns((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
  };
  const handleDragStart = (colId: string) => setDraggedCol(colId);
  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (!draggedCol) return;
    const fromIdx = selectedColumns.indexOf(draggedCol);
    if (fromIdx !== targetIdx) moveColumn(fromIdx, targetIdx);
  };
  const handleDragEnd = () => setDraggedCol(null);

  const availableColumns = ALL_COLUMNS.filter((c) => !selectedColumns.includes(c.id));

  // Collect all unique problem categories from respondents
  const allProblemCategories = useMemo(() => {
    const cats = new Set<string>();
    respondents.forEach((r) => {
      (r.problemCategories ?? []).forEach((c: string) => cats.add(c));
    });
    return [...cats].sort();
  }, [respondents]);
  const activeColumns = selectedColumns.map((id) => ALL_COLUMNS.find((c) => c.id === id)!).filter(Boolean);

  // ── Chart data ──
  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach((t) => { counts[t.status] = (counts[t.status] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace("_", " "), value }));
  }, [filteredData]);

  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach((t) => {
      const name = t.categoryName ?? "Uncategorized";
      counts[name] = (counts[name] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const leadSourceChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach((t) => {
      counts[t.leadSourceName] = (counts[t.leadSourceName] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // ── Agent performance ──
  const agentPerformance = useMemo(() => {
    const agents = users.filter((u: any) => u.role === "agent" && u.isActive);
    return agents.map((a: any) => {
      const agentTickets = filteredData.filter((t) => t.assignedAgentId === (a.uid || a.id));
      const open = agentTickets.filter((t) => t.status === "open").length;
      const inProgress = agentTickets.filter((t) => t.status === "in_progress").length;
      const resolved = agentTickets.filter((t) => t.status === "resolved").length;
      const closed = agentTickets.filter((t) => t.status === "closed").length;
      const total = agentTickets.length;
      const rate = total > 0 ? Math.round(((resolved + closed) / total) * 100) : 0;
      return {
        uid: a.uid || a.id,
        name: a.displayName ?? a.name ?? "—",
        total, open, inProgress, resolved, closed, rate,
      };
    }).sort((a: any, b: any) => b.total - a.total);
  }, [users, filteredData]);

  // ── Summary stats ──
  const stats = useMemo(() => [
    { label: "Total Tickets", value: filteredData.length, icon: TrendingUp, color: "text-primary", bg: "bg-primary/8" },
    { label: "Active Agents", value: agentPerformance.filter((a: any) => a.total > 0).length, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Resolved", value: filteredData.filter((t) => t.status === "resolved" || t.status === "closed").length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Open", value: filteredData.filter((t) => t.status === "open").length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  ], [filteredData, agentPerformance]);

  // ── Export functions ──
  const exportCSV = () => {
    const header = activeColumns.map((c) => c.label);
    const rows = filteredData.map((row) => activeColumns.map((c) => `"${c.getValue(row).replace(/"/g, '""')}"`));
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `oms-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    // Dynamic import SheetJS
    const XLSX = await import("xlsx");
    const header = activeColumns.map((c) => c.label);
    const data = filteredData.map((row) => {
      const obj: Record<string, string> = {};
      activeColumns.forEach((c) => { obj[c.label] = c.getValue(row); });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(data, { header });
    // Auto-width columns
    ws["!cols"] = header.map((h) => ({ wch: Math.max(h.length + 2, 15) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");

    // Add Agent Performance sheet
    if (agentPerformance.length > 0) {
      const agentData = agentPerformance.map((a: any) => ({
        "Agent": a.name, "Total": a.total, "Open": a.open,
        "In Progress": a.inProgress, "Resolved": a.resolved,
        "Closed": a.closed, "Resolve Rate": `${a.rate}%`,
      }));
      const ws2 = XLSX.utils.json_to_sheet(agentData);
      ws2["!cols"] = [{ wch: 20 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws2, "Agent Performance");
    }

    XLSX.writeFile(wb, `oms-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Reports & Analytics</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filteredData.length} tickets{dateFrom || dateTo ? " (filtered)" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 text-xs gap-1.5">
            <Download size={12} /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} className="h-8 text-xs gap-1.5">
            <FileSpreadsheet size={12} /> Excel
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border border-border rounded-md p-0.5 bg-muted/30 w-fit">
        {([
          { key: "overview", label: "Overview", icon: BarChart2 },
          { key: "custom", label: "Custom Report", icon: Table2 },
          { key: "agents", label: "Agent Performance", icon: UserCheck },
        ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs rounded font-medium transition-colors",
              tab === key ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon size={12} />{label}
          </button>
        ))}
      </div>

      {/* Date range filter (shared across tabs) */}
      <div className="flex items-center gap-3 flex-wrap">
        <CalendarDays size={14} className="text-muted-foreground" />
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <X size={12} /> Clear dates
          </button>
        )}
      </div>

      {/* ═══════════ OVERVIEW TAB ═══════════ */}
      {tab === "overview" && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className="border border-border shadow-none">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                        <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                      </div>
                      <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                        <Icon size={16} className={s.color} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Status distribution */}
            <Card className="border border-border shadow-none">
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="text-sm font-semibold">Tickets by Status</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={statusChartData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                    <Bar dataKey="value" name="Tickets" radius={[4, 4, 0, 0]}>
                      {statusChartData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name.replace(" ", "_")] ?? "#6366f1"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category pie chart */}
            <Card className="border border-border shadow-none">
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="text-sm font-semibold">Tickets by Category</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={categoryChartData} cx="50%" cy="50%" outerRadius={60} innerRadius={30} dataKey="value">
                      {categoryChartData.map((_, i) => (
                        <Cell key={i} fill={OUTCOME_COLORS[i % OUTCOME_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1 px-3">
                  {categoryChartData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: OUTCOME_COLORS[i % OUTCOME_COLORS.length] }} />
                        <span className="text-muted-foreground truncate max-w-[140px]">{item.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lead source chart */}
          <Card className="border border-border shadow-none">
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-sm font-semibold">Tickets by Lead Source</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={leadSourceChartData} barSize={28} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="value" name="Tickets" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════════ CUSTOM REPORT TAB ═══════════ */}
      {tab === "custom" && (
        <>
          {/* Filters */}
          <Card className="border border-border shadow-none">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <Filter size={12} className="text-primary" /> Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Status</label>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full h-8 text-xs border border-border rounded-md px-2 bg-background">
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Category</label>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full h-8 text-xs border border-border rounded-md px-2 bg-background">
                    <option value="all">All Categories</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Agent</label>
                  <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} className="w-full h-8 text-xs border border-border rounded-md px-2 bg-background">
                    <option value="all">All Agents</option>
                    {users.filter((u: any) => u.role === "agent").map((u: any) => (
                      <option key={u.uid || u.id} value={u.uid || u.id}>{u.displayName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Problem Category</label>
                  <select value={filterProblemCat} onChange={(e) => setFilterProblemCat(e.target.value)} className="w-full h-8 text-xs border border-border rounded-md px-2 bg-background">
                    <option value="all">All Problem Categories</option>
                    {allProblemCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Column selector — drag & drop */}
          <Card className="border border-border shadow-none">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <Table2 size={12} className="text-primary" /> Columns — drag to reorder, click + to add
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {/* Selected columns */}
              <div className="flex flex-wrap gap-1.5 mb-3 min-h-[32px] p-2 rounded-lg border border-dashed border-border bg-muted/20">
                {selectedColumns.map((colId, idx) => {
                  const col = ALL_COLUMNS.find((c) => c.id === colId);
                  if (!col) return null;
                  return (
                    <span
                      key={colId}
                      draggable
                      onDragStart={() => handleDragStart(colId)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border cursor-grab active:cursor-grabbing transition-colors",
                        col.group === "respondent" ? "bg-blue-50 border-blue-200 text-blue-700" :
                        col.group === "ticket" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                        "bg-slate-50 border-slate-200 text-slate-700",
                        draggedCol === colId && "opacity-50"
                      )}
                    >
                      <GripVertical size={10} className="opacity-40" />
                      {col.label}
                      <button onClick={() => removeColumn(colId)} className="ml-0.5 hover:text-red-600"><X size={9} /></button>
                    </span>
                  );
                })}
                {selectedColumns.length === 0 && (
                  <span className="text-[10px] text-muted-foreground italic">No columns selected — click + below to add</span>
                )}
              </div>

              {/* Available columns */}
              <div className="flex flex-wrap gap-1.5">
                {availableColumns.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => addColumn(col.id)}
                    className={cn(
                      "flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border transition-colors hover:shadow-sm",
                      col.group === "respondent" ? "border-blue-200 text-blue-600 hover:bg-blue-50" :
                      col.group === "ticket" ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" :
                      "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Plus size={9} />{col.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-200" /> Respondent</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-200" /> Ticket</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-200" /> Meta</span>
              </div>
            </CardContent>
          </Card>

          {/* Data table */}
          <Card className="border border-border shadow-none overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold">{filteredData.length} records</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportCSV} className="h-7 text-[10px] gap-1">
                  <Download size={10} /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportExcel} className="h-7 text-[10px] gap-1">
                  <FileSpreadsheet size={10} /> Excel
                </Button>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {activeColumns.map((col) => (
                      <th key={col.id} className="text-left text-[10px] font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.slice(0, 100).map((row, i) => (
                    <tr key={row.ticketId ?? i} className="border-b border-border last:border-0 hover:bg-muted/20">
                      {activeColumns.map((col) => (
                        <td key={col.id} className="px-3 py-2 text-xs text-foreground whitespace-nowrap max-w-[200px] truncate">
                          {col.getValue(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredData.length > 100 && (
                <p className="text-[10px] text-muted-foreground text-center py-2">Showing first 100 of {filteredData.length} records. Export to see all.</p>
              )}
              {filteredData.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">No data matches your filters.</p>
              )}
            </div>
          </Card>
        </>
      )}

      {/* ═══════════ AGENT PERFORMANCE TAB ═══════════ */}
      {tab === "agents" && (
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3 px-5 pt-5 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Agent Performance</CardTitle>
            <Button variant="outline" size="sm" onClick={exportExcel} className="h-7 text-[10px] gap-1">
              <FileSpreadsheet size={10} /> Export Excel
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Agent", "Total", "Open", "In Progress", "Resolved", "Closed", "Resolve Rate", "Progress"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agentPerformance.map((a: any) => (
                  <tr key={a.uid} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-semibold flex-shrink-0">
                          {a.name.charAt(0)}
                        </div>
                        <span className="font-medium text-sm">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 font-semibold">{a.total}</td>
                    <td className="px-3 py-3.5 text-blue-600 font-medium">{a.open}</td>
                    <td className="px-3 py-3.5 text-amber-600 font-medium">{a.inProgress}</td>
                    <td className="px-3 py-3.5 text-emerald-600 font-medium">{a.resolved}</td>
                    <td className="px-3 py-3.5 text-slate-500 font-medium">{a.closed}</td>
                    <td className="px-3 py-3.5">
                      <span className={cn("text-xs font-semibold", a.rate >= 70 ? "text-emerald-600" : a.rate >= 50 ? "text-amber-600" : "text-red-500")}>
                        {a.rate}%
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", a.rate >= 70 ? "bg-emerald-500" : a.rate >= 50 ? "bg-amber-500" : "bg-red-400")}
                          style={{ width: `${a.rate}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
                {agentPerformance.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-xs text-muted-foreground">No agent data available.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
