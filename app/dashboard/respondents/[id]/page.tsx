"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronLeft, Phone, Mail, Globe, StickyNote, Plus, Pencil,
  Ticket, Check, X, ChevronDown, ChevronUp, Lock, MessageSquare,
  MapPin, CalendarDays, Tag, TrendingUp, Bot, ShieldAlert, ShieldOff, ShieldCheck, AlertTriangle, Tv2,
  ArrowUpRight, MessageCircle, Instagram, Facebook, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/tickets/TicketStatusBadge";
import { useRespondent } from "@/hooks/use-firestore-respondents";
import { useTicketsByRespondent, useMessages } from "@/hooks/use-firestore-tickets";
import { useLeadSources } from "@/hooks/use-firestore-config";
import { updateRespondent } from "@/lib/firestore-services";
import { useAuthStore } from "@/store/auth-store";
import { useOrgStore } from "@/store/org-store";
import { cn } from "@/lib/utils";
import type { Respondent, RespondentProgress } from "@/types";
import { DEFAULT_PROGRESS_STEPS, DEFAULT_PROGRAM_SOURCES } from "@/types";

// Progress step config
const PROGRESS_CONFIG: Record<RespondentProgress, { color: string; bg: string; border: string; desc: string }> = {
  Data:       { color: "text-slate-600",   bg: "bg-slate-100",   border: "border-slate-300",  desc: "Identitas sudah dicatat" },
  Doa:        { color: "text-blue-600",    bg: "bg-blue-50",     border: "border-blue-200",   desc: "Sudah didoakan" },
  Konseling:  { color: "text-amber-600",   bg: "bg-amber-50",    border: "border-amber-200",  desc: "Dalam proses konseling" },
  Rekomitmen: { color: "text-purple-600",  bg: "bg-purple-50",   border: "border-purple-200", desc: "Komitmen diperbarui" },
  Salvation:  { color: "text-emerald-600", bg: "bg-emerald-50",  border: "border-emerald-200",desc: "Menerima keselamatan" },
  POP:        { color: "text-orange-600",  bg: "bg-orange-50",   border: "border-orange-200", desc: "Part of the Parish" },
};

// Small helper to fetch messages for a ticket inline
function TicketMessages({ ticketId }: { ticketId: string }) {
  const { messages, loading } = useMessages(ticketId);
  if (loading) return <p className="text-xs text-muted-foreground px-4 py-2">Loading messages...</p>;
  if (messages.length === 0) return <p className="text-xs text-muted-foreground italic px-4 py-2">No messages yet.</p>;
  return (
    <>
      {messages.map((msg) => (
        <div key={msg.messageId} className={cn("px-4 py-2 text-xs", msg.isInternal && "bg-amber-50/50 border-l-2 border-amber-300")}>
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn("font-semibold", msg.senderRole === "agent" ? "text-primary" : (msg.senderRole as string) === "respondent" ? "text-foreground" : "text-muted-foreground")}>
              {msg.senderName}
            </span>
            {msg.isInternal && <Lock size={9} className="text-amber-600" />}
            <span className="text-muted-foreground/50 text-[10px]">
              {new Date(msg.createdAt).toLocaleString("en-US", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p className="text-muted-foreground leading-relaxed">{msg.content}</p>
        </div>
      ))}
    </>
  );
}

export default function RespondentProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const currentUser = useAuthStore((s) => s.currentUser);

  // Firestore data
  const { respondent: firestoreRespondent, loading: respLoading } = useRespondent(id);
  const { tickets, loading: ticketsLoading } = useTicketsByRespondent(id);
  const { items: leadSources } = useLeadSources();

  const [respondent, setRespondent] = useState<Respondent | null>(null);
  const [editing, setEditing]       = useState(false);

  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  // ── Edit form state (must be declared before any conditional return) ──
  const [editName,         setEditName]         = useState("");
  const [editPhone,        setEditPhone]         = useState("");
  const [editEmail,        setEditEmail]         = useState("");
  const [editLeadSource,   setEditLeadSource]    = useState("");
  const [editNotes,        setEditNotes]         = useState("");
  const [editAge,          setEditAge]           = useState("");
  const [editCity,         setEditCity]          = useState("");
  const [editProgress,     setEditProgress]      = useState<RespondentProgress | "">("");
  const [editCategories,   setEditCategories]    = useState<string[]>([]);
  const [newCategory,      setNewCategory]       = useState("");
  const [editProgramSource, setEditProgramSource] = useState("");
  const [showJournalInput, setShowJournalInput] = useState(false);
  const [newJournalEntry, setNewJournalEntry] = useState("");
  const [customProgramSources, setCustomProgramSources] = useState<string[]>([]);
  const [newProgramSource, setNewProgramSource]  = useState("");

  // Block / unblock
  const [showBlockDialog,  setShowBlockDialog]   = useState(false);
  const [blockReason,      setBlockReason]       = useState("");
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);

  // Sync Firestore respondent into local state for edit form
  useEffect(() => {
    if (firestoreRespondent) setRespondent(firestoreRespondent);
  }, [firestoreRespondent]);

  // Set first expanded ticket when tickets load
  useEffect(() => {
    if (tickets.length > 0 && !expandedTicketId) {
      setExpandedTicketId(tickets[0]?.ticketId ?? null);
    }
  }, [tickets, expandedTicketId]);

  // ── Loading state (AFTER all hooks) ──
  if (respLoading || ticketsLoading || !respondent) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading respondent...</p>
        </div>
      </div>
    );
  }

  const getLeadSourceName = (lsId: string) =>
    leadSources.find((ls: any) => ls.id === lsId || ls.leadSourceId === lsId)?.name ?? "Unknown";

  // Lead sources used per ticket (cross-channel history)
  const channelsUsed = [...new Set(tickets.map((t) => t.leadSourceId).filter(Boolean))]
    .map((lsId) => leadSources.find((ls: any) => ls.id === lsId || ls.leadSourceId === lsId))
    .filter(Boolean);

  // First contact = earliest ticket date
  const firstContact = tickets.length > 0
    ? new Date(tickets[tickets.length - 1].createdAt)
    : respondent.firstContactDate ? new Date(respondent.firstContactDate) : null;

  const handleBlock = async () => {
    if (!blockReason.trim()) return;
    const updates = {
      isBlocked: true,
      blockedReason: blockReason.trim(),
      blockedAt: new Date().toISOString(),
      blockedBy: currentUser?.displayName ?? "Agent",
    };
    try {
      await updateRespondent(id, updates);
      setRespondent((prev) => prev ? { ...prev, ...updates } : prev);
    } catch (err) {
      console.error("Failed to block respondent:", err);
    }
    setBlockReason("");
    setShowBlockDialog(false);
  };

  const handleUnblock = async () => {
    const updates = {
      isBlocked: false,
      blockedReason: null,
      blockedAt: null,
      blockedBy: null,
    };
    try {
      await updateRespondent(id, updates);
      setRespondent((prev) => prev ? { ...prev, isBlocked: false, blockedReason: undefined, blockedAt: undefined, blockedBy: undefined } : prev);
    } catch (err) {
      console.error("Failed to unblock respondent:", err);
    }
    setShowUnblockDialog(false);
  };

  const startEdit = () => {
    setEditName(respondent.fullName);
    setEditPhone(respondent.phone ?? "");
    setEditEmail(respondent.email ?? "");
    setEditLeadSource(respondent.leadSourceId);
    setEditNotes(respondent.notes ?? "");
    setEditAge(respondent.age?.toString() ?? "");
    setEditCity(respondent.city ?? "");
    setEditProgress(respondent.progress ?? "");
    setEditCategories(respondent.problemCategories ?? []);
    setEditProgramSource(respondent.programSource ?? "");
    setEditing(true);
  };

  const saveEdit = async () => {
    const updates: any = {
      fullName:          editName,
      phone:             editPhone || undefined,
      email:             editEmail || undefined,
      leadSourceId:      editLeadSource,
      notes:             editNotes || undefined,
      age:               editAge ? parseInt(editAge, 10) : undefined,
      city:              editCity || undefined,
      progress:          (editProgress as RespondentProgress) || undefined,
      problemCategories: editCategories.length > 0 ? editCategories : [],
      programSource:     editProgramSource || undefined,
    };
    try {
      await updateRespondent(id, updates);
      setRespondent((prev) => prev ? { ...prev, ...updates, leadSourceName: getLeadSourceName(editLeadSource) } : prev);
      setEditing(false);
    } catch (err) {
      console.error("Failed to update respondent:", err);
    }
  };

  const addCategory = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !editCategories.includes(trimmed)) {
      setEditCategories((prev) => [...prev, trimmed]);
    }
    setNewCategory("");
  };

  const removeCategory = (cat: string) =>
    setEditCategories((prev) => prev.filter((c) => c !== cat));

  const currentProgressIdx = respondent.progress
    ? DEFAULT_PROGRESS_STEPS.indexOf(respondent.progress)
    : -1;

  return (
    <>
    <div className="flex flex-col gap-5 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard/respondents" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={14} />Respondents
        </Link>
        <span className="text-muted-foreground/40 text-xs">/</span>
        <span className="text-xs text-foreground font-medium">{respondent.fullName}</span>
      </div>

      {/* Blocked Banner */}
      {respondent.isBlocked && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-red-200 bg-red-50">
          <ShieldOff size={15} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-red-700">Respondent Blocked</p>
            <p className="text-[11px] text-red-600 mt-0.5">
              This number has been blocked from contacting the system.
              {respondent.blockedReason && <span> Reason: {respondent.blockedReason}.</span>}
              {respondent.blockedAt && <span> Blocked on {new Date(respondent.blockedAt).toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" })}.</span>}
            </p>
          </div>
          <button
            onClick={() => setShowUnblockDialog(true)}
            className="flex items-center gap-1 text-[11px] font-semibold text-red-700 hover:text-red-900 transition-colors whitespace-nowrap"
          >
            <ShieldCheck size={12} /> Unblock
          </button>
        </div>
      )}

      <div className="flex gap-5 items-start">
        {/* ── LEFT PANEL ── */}
        <div className="flex flex-col gap-4 w-80 flex-shrink-0">
          <Card className="border border-border shadow-none">
            <CardContent className="p-5">

              {/* Avatar + name */}
              <div className="flex flex-col items-center text-center gap-3 pb-4 border-b border-border">
                <div className="relative">
                  <div className={cn("w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold", respondent.isBlocked ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary")}>
                    {respondent.isBlocked ? <ShieldOff size={22} /> : respondent.fullName.charAt(0)}
                  </div>
                  {respondent.progress && (
                    <span className={cn(
                      "absolute -bottom-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                      PROGRESS_CONFIG[respondent.progress].bg,
                      PROGRESS_CONFIG[respondent.progress].border,
                      PROGRESS_CONFIG[respondent.progress].color,
                    )}>
                      {respondent.progress}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{respondent.fullName}</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground border border-border mt-1">
                    {getLeadSourceName(respondent.leadSourceId)}
                  </span>
                </div>
              </div>

              {/* Action buttons row */}
              {!editing && (
                <div className="flex flex-col gap-2 pt-3">
                  {/* Edit + Block */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline" size="sm"
                      className="flex-1 h-7 text-xs gap-1.5"
                      onClick={startEdit}
                    >
                      <Pencil size={11} /> Edit
                    </Button>
                    {respondent.isBlocked ? (
                      <Button
                        variant="outline" size="sm"
                        className="flex-1 h-7 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => setShowUnblockDialog(true)}
                      >
                        <ShieldCheck size={11} /> Unblock
                      </Button>
                    ) : (
                      <Button
                        variant="outline" size="sm"
                        className="flex-1 h-7 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => setShowBlockDialog(true)}
                      >
                        <ShieldOff size={11} /> Block
                      </Button>
                    )}
                  </div>

                  {/* New Ticket — single CTA */}
                  {!respondent.isBlocked && (
                    <Button asChild size="sm" className="w-full h-8 text-xs gap-1.5">
                      <Link href={`/dashboard/tickets/new?respondentId=${respondent.respondentId}`}>
                        <Ticket size={11} /> New Ticket
                      </Link>
                    </Button>
                  )}
                </div>
              )}

              {editing ? (
                /* ── EDIT FORM ── */
                <div className="flex flex-col gap-3 pt-4">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Full Name</label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Age</label>
                      <Input value={editAge} onChange={(e) => setEditAge(e.target.value)} className="h-8 text-xs" type="number" min="1" max="120" placeholder="yrs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">City</label>
                      <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} className="h-8 text-xs" placeholder="City..." />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Phone</label>
                    <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="h-8 text-xs" type="tel" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Email</label>
                    <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="h-8 text-xs" type="email" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Lead Source</label>
                    <Select value={editLeadSource} onValueChange={setEditLeadSource}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {leadSources.filter((ls: any) => ls.isActive).map((ls: any) => (
                          <SelectItem key={ls.id || ls.leadSourceId} value={ls.id || ls.leadSourceId}>{ls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Progress</label>
                    <Select value={editProgress} onValueChange={(v) => setEditProgress(v as RespondentProgress)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select progress..." /></SelectTrigger>
                      <SelectContent>
                        {DEFAULT_PROGRESS_STEPS.map((s) => (
                          <SelectItem key={s} value={s}>
                            <span className={cn("font-medium", PROGRESS_CONFIG[s].color)}>{s}</span>
                            <span className="ml-2 text-muted-foreground text-[10px]">— {PROGRESS_CONFIG[s].desc}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Issue Categories</label>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {editCategories.map((cat) => (
                        <span key={cat} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-foreground">
                          {cat}
                          <button onClick={() => removeCategory(cat)} className="hover:text-destructive transition-colors">
                            <X size={9} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Input
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
                        placeholder="Add category..."
                        className="h-7 text-xs flex-1"
                      />
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={addCategory}>
                        <Plus size={11} />
                      </Button>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1">e.g. Marriage, Anxiety, Financial, Grief</p>
                  </div>

                  {/* Program Source */}
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Program Source</label>
                    <Select
                      value={editProgramSource}
                      onValueChange={(v) => {
                        if (v === "__custom__") return;
                        setEditProgramSource(v);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select program..." />
                      </SelectTrigger>
                      <SelectContent>
                        {[...DEFAULT_PROGRAM_SOURCES, ...customProgramSources].map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Add custom program source */}
                    <div className="flex gap-1 mt-1.5">
                      <Input
                        value={newProgramSource}
                        onChange={(e) => setNewProgramSource(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const trimmed = newProgramSource.trim();
                            if (trimmed && !DEFAULT_PROGRAM_SOURCES.includes(trimmed) && !customProgramSources.includes(trimmed)) {
                              setCustomProgramSources((prev) => [...prev, trimmed]);
                              setEditProgramSource(trimmed);
                            }
                            setNewProgramSource("");
                          }
                        }}
                        placeholder="Add new program..."
                        className="h-7 text-xs flex-1"
                      />
                      <Button
                        size="sm" variant="outline" className="h-7 px-2"
                        onClick={() => {
                          const trimmed = newProgramSource.trim();
                          if (trimmed && !DEFAULT_PROGRAM_SOURCES.includes(trimmed) && !customProgramSources.includes(trimmed)) {
                            setCustomProgramSources((prev) => [...prev, trimmed]);
                            setEditProgramSource(trimmed);
                          }
                          setNewProgramSource("");
                        }}
                      >
                        <Plus size={11} />
                      </Button>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1">e.g. Website, Instagram, Crusade Event</p>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Counselor Notes</label>
                    <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="text-xs resize-none min-h-[120px]" placeholder="Summary of respondent's situation, key observations, follow-up actions..." />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={saveEdit}>
                      <Check size={12} className="mr-1" />Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                      <X size={12} />
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── VIEW MODE ── */
                <div className="flex flex-col gap-3 pt-4">
                  {/* Contact info */}
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Phone size={13} className="text-primary/60 flex-shrink-0" />
                    <span className="text-xs">{respondent.phone ?? <span className="italic text-muted-foreground/40">No phone</span>}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Mail size={13} className="text-primary/60 flex-shrink-0" />
                    <span className="text-xs truncate">{respondent.email || <span className="italic text-muted-foreground/40">No email</span>}</span>
                  </div>

                  {/* Age + City */}
                  {(respondent.age || respondent.city) && (
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <MapPin size={13} className="text-primary/60 flex-shrink-0" />
                      <span className="text-xs">
                        {[respondent.age && `${respondent.age} yrs`, respondent.city].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                  )}

                  {/* First contact */}
                  {firstContact && (
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <CalendarDays size={13} className="text-primary/60 flex-shrink-0" />
                      <span className="text-xs">
                        First contact: {firstContact.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  )}

                  {/* Lead source (initial) */}
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Globe size={13} className="text-primary/60 flex-shrink-0" />
                    <span className="text-xs">{getLeadSourceName(respondent.leadSourceId)}</span>
                  </div>

                  {/* Program Source */}
                  {respondent.programSource && (
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <Tv2 size={13} className="text-primary/60 flex-shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold leading-none mb-0.5">Program Source</span>
                        <span className="text-xs font-medium text-foreground">{respondent.programSource}</span>
                      </div>
                    </div>
                  )}

                  {/* Lead sources by ticket (cross-channel) */}
                  {channelsUsed.length > 1 && (
                    <div className="pt-1 pb-1">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold mb-1.5">Channel yang digunakan</p>
                      <div className="flex flex-wrap gap-1">
                        {channelsUsed.map((ls) => ls && (
                          <span key={ls.leadSourceId} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary border border-border text-secondary-foreground">
                            {ls.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Problem categories */}
                  {respondent.problemCategories && respondent.problemCategories.length > 0 && (
                    <div className="pt-1">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Tag size={11} className="text-primary/60" />
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold">Issue Categories</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {respondent.problemCategories.map((cat) => (
                          <span key={cat} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted border border-border text-foreground">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {respondent.notes && (
                    <div className="flex items-start gap-2.5 text-muted-foreground">
                      <StickyNote size={13} className="text-primary/60 flex-shrink-0 mt-0.5" />
                      <span className="text-xs leading-relaxed">{respondent.notes}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {!editing && (
            <Button variant="outline" size="sm" className="w-full" onClick={startEdit}>
              <Pencil size={13} className="mr-1.5" />Edit Profile
            </Button>
          )}

          {/* ── PROGRESS TRACKER ── */}
          {!editing && (
            <Card className="border border-border shadow-none">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <TrendingUp size={13} className="text-primary" />Ministry Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex flex-col gap-2">
                  {DEFAULT_PROGRESS_STEPS.map((step, idx) => {
                    const isActive  = respondent.progress === step;
                    const isDone    = currentProgressIdx > idx;
                    const cfg       = PROGRESS_CONFIG[step];
                    return (
                      <div key={step} className="flex items-center gap-2.5">
                        {/* Step circle */}
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 border",
                          isActive  ? cn(cfg.bg, cfg.border, cfg.color) :
                          isDone    ? "bg-emerald-500 border-emerald-500 text-white" :
                                      "bg-muted border-border text-muted-foreground"
                        )}>
                          {isDone ? <Check size={9} /> : idx + 1}
                        </div>
                        {/* Connector line */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "text-xs font-medium",
                              isActive ? cfg.color : isDone ? "text-emerald-600" : "text-muted-foreground"
                            )}>
                              {step}
                            </span>
                            {isActive && (
                              <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full border", cfg.bg, cfg.border, cfg.color)}>
                                Sekarang
                              </span>
                            )}
                          </div>
                          {isActive && (
                            <p className="text-[9px] text-muted-foreground mt-0.5">{cfg.desc}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── PROGRAM SOURCE CARD ── */}
          {!editing && (
            <Card className="border border-border shadow-none">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <Tv2 size={13} className="text-primary" />Program Source
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {respondent.programSource ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{respondent.programSource}</span>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground px-2" onClick={startEdit}>
                      <Pencil size={9} className="mr-1" />Edit
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={startEdit}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground border border-dashed border-border rounded-md py-2.5 hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    <Plus size={12} />Add program source
                  </button>
                )}
                <div className="flex flex-wrap gap-1 mt-3">
                  {DEFAULT_PROGRAM_SOURCES.map((p) => (
                    <span
                      key={p}
                      className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full border cursor-default transition-colors",
                        respondent.programSource === p
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted border-border text-muted-foreground"
                      )}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── RIGHT PANEL — Counseling Journal + Ticket History ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* ── COUNSELING JOURNAL ── */}
          <Card className="border border-border shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Counseling Journal</h3>
                </div>
                <button
                  onClick={() => setShowJournalInput(!showJournalInput)}
                  className="text-[10px] text-primary hover:underline flex items-center gap-1"
                >
                  <Plus size={11} /> Add entry
                </button>
              </div>

              {/* New journal entry input */}
              {showJournalInput && (
                <div className="mb-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                  <Textarea
                    value={newJournalEntry}
                    onChange={(e) => setNewJournalEntry(e.target.value)}
                    placeholder="Record counseling observations, progress notes, follow-up actions, prayer points..."
                    className="text-xs resize-none min-h-[80px] mb-2 bg-background"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="text-xs h-7" onClick={async () => {
                      if (!newJournalEntry.trim()) return;
                      const [{ doc, updateDoc, arrayUnion, serverTimestamp }, { db }] = await Promise.all([
                        import("firebase/firestore"), import("@/lib/firebase"),
                      ]);
                      const entry = {
                        text: newJournalEntry.trim(),
                        author: currentUser?.displayName ?? "Unknown",
                        authorId: currentUser?.uid ?? "",
                        ticketRef: null,
                        createdAt: new Date().toISOString(),
                      };
                      await updateDoc(doc(db, "respondents", respondent.respondentId), {
                        journal: arrayUnion(entry),
                        updatedAt: serverTimestamp(),
                      });
                      setNewJournalEntry("");
                      setShowJournalInput(false);
                    }}>
                      <Check size={11} className="mr-1" /> Save entry
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setShowJournalInput(false); setNewJournalEntry(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Journal entries — from respondent.journal + ticket agent notes */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(() => {
                  const journalEntries = (respondent.journal ?? [])
                    .map((e: any) => ({ ...e, source: "manual" }));

                  // Merge ticket agent notes into journal
                  const ticketNotes = tickets
                    .filter((t: any) => t.agentNotes)
                    .map((t: any) => ({
                      text: t.agentNotes,
                      author: t.assignedAgentName ?? "Agent",
                      authorId: t.assignedAgentId ?? "",
                      ticketRef: t.ticketNumber,
                      createdAt: t.updatedAt ?? t.createdAt,
                      source: "ticket",
                    }));

                  const allEntries = [...journalEntries, ...ticketNotes]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                  if (allEntries.length === 0) {
                    return (
                      <div className="text-center py-6">
                        <FileText size={20} className="mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-[11px] text-muted-foreground">
                          No journal entries yet. Add notes to track counseling progress.
                        </p>
                      </div>
                    );
                  }

                  return allEntries.map((entry: any, idx: number) => (
                    <div key={idx} className={cn(
                      "p-3 rounded-lg border text-xs",
                      entry.source === "ticket" ? "bg-amber-50/50 border-amber-200" : "bg-background border-border"
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground">{entry.author}</span>
                        <div className="flex items-center gap-2">
                          {entry.ticketRef && (
                            <span className="text-[9px] font-mono text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                              {entry.ticketRef}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      </div>
                      <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{entry.text}</p>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>

          {/* ── TICKET HISTORY ── */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Ticket History</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tickets.length} tickets
                {firstContact && ` · Since ${firstContact.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/dashboard/tickets/new">
                <Plus size={13} className="mr-1.5" />New Ticket
              </Link>
            </Button>
          </div>

          {tickets.length === 0 ? (
            <Card className="border border-dashed border-border shadow-none">
              <CardContent className="p-10 flex flex-col items-center gap-3 text-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Ticket size={16} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No tickets for this respondent yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {tickets.map((t) => {
                const isOpen     = expandedTicketId === t.ticketId;
                const ls         = leadSources.find((l: any) => l.id === t.leadSourceId || l.leadSourceId === t.leadSourceId);
                return (
                  <Card key={t.ticketId} className={cn("border shadow-none overflow-hidden transition-all", isOpen ? "border-primary/30" : "border-border")}>
                    {/* Ticket row */}
                    <button className="w-full text-left" onClick={() => setExpandedTicketId(isOpen ? null : t.ticketId)}>
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className={cn("w-1 self-stretch rounded-full flex-shrink-0", isOpen ? "bg-primary" : "bg-border")} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="font-mono text-xs font-semibold text-primary">{t.ticketNumber}</span>
                            <TicketStatusBadge status={t.status} />
                            <TicketPriorityBadge priority={t.priority} />
                            {/* Lead source badge per ticket */}
                            {ls && (
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-secondary border border-border text-secondary-foreground">
                                {ls.name}
                              </span>
                            )}
                            {/* HoD badge */}
                            {t.handledBy === "escalated" && t.escalation && (
                              <span className="flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200 text-orange-700">
                                <ShieldAlert size={8} />HoD
                              </span>
                            )}
                            {t.aiMessageCount && t.aiMessageCount > 0 && !(t.handledBy === "escalated") && (
                              <span className="flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-600">
                                <Bot size={8} />AI
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-foreground truncate">{t.subject}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(t.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                              {" "}
                              {new Date(t.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {t.assignedAgentName && (
                              <span className="text-[10px] text-muted-foreground">Agent: {t.assignedAgentName}</span>
                            )}
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <MessageSquare size={9} />—
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Link
                            href={`/dashboard/tickets/${t.ticketId}`}
                            className="text-[10px] text-primary hover:underline px-2 py-1 rounded-md hover:bg-primary/5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Buka
                          </Link>
                          {isOpen ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                        </div>
                      </div>
                    </button>

                    {/* Expandable thread */}
                    {isOpen && (
                      <div className="border-t border-border bg-muted/20">
                        {(t.categoryName || t.outcomeName) && (
                          <div className="flex items-center gap-4 px-5 py-2 border-b border-border bg-background text-[10px] text-muted-foreground">
                            {t.categoryName && <span>Category: <strong className="text-foreground">{t.categoryName}</strong></span>}
                            {t.outcomeName  && <span>Outcome: <strong className="text-foreground">{t.outcomeName}</strong></span>}
                          </div>
                        )}
                        <div className="flex flex-col gap-0 max-h-72 overflow-y-auto">
                          <TicketMessages ticketId={t.ticketId} />
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ── BLOCK DIALOG ── */}
    {showBlockDialog && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-5 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <ShieldOff size={16} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Block Respondent</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nomor <span className="font-mono font-semibold text-foreground">{respondent.phone ?? "—"}</span> tidak akan bisa menghubungi OMS di semua channel.
              </p>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Alasan Pemblokiran <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-1.5 mb-2">
              {["Spam / Bot", "Kata-kata tidak pantas", "Pelecehan agent", "Nomor tidak valid", "Lainnya"].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setBlockReason(reason)}
                  className={cn(
                    "text-left text-xs px-3 py-2 rounded-md border transition-colors",
                    blockReason === reason
                      ? "bg-red-50 border-red-300 text-red-700 font-medium"
                      : "bg-background border-border text-foreground hover:border-red-200"
                  )}
                >
                  {reason}
                </button>
              ))}
            </div>
            <Input
              placeholder="Atau tulis alasan lain..."
              value={["Spam / Bot", "Kata-kata tidak pantas", "Pelecehan agent", "Nomor tidak valid", "Lainnya"].includes(blockReason) ? "" : blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => { setShowBlockDialog(false); setBlockReason(""); }}>
              Batal
            </Button>
            <Button
              size="sm"
              className="flex-1 h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
              disabled={!blockReason.trim()}
              onClick={handleBlock}
            >
              <ShieldOff size={11} className="mr-1" /> Block Now
            </Button>
          </div>
        </div>
      </div>
    )}

    {/* ── UNBLOCK DIALOG ── */}
    {showUnblockDialog && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-5 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={16} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Unblock Respondent</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nomor <span className="font-mono font-semibold text-foreground">{respondent.phone ?? "—"}</span> akan kembali bisa menghubungi OMS.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle size={12} className="text-amber-600 flex-shrink-0" />
            <p className="text-[11px] text-amber-700">Make sure the reason for blocking has been resolved before unblocking.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => setShowUnblockDialog(false)}>
              Batal
            </Button>
            <Button size="sm" className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleUnblock}>
              <ShieldCheck size={11} className="mr-1" /> Unblock
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
