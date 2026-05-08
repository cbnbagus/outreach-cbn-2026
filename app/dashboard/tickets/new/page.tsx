"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft, Check, Phone, MessageCircle, Mail,
  Instagram, Facebook, ArrowDownLeft, ArrowUpRight,
  User, Clock, CalendarDays, ExternalLink, PhoneCall,
  Send, ChevronRight, Info, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCallStore } from "@/store/call-store";
import { usePresenceStore } from "@/store/presence-store";
import { useRespondents } from "@/hooks/use-firestore-respondents";
import { useCategories, useLeadSources, useUsers } from "@/hooks/use-firestore-config";
import { useTicketsByRespondent } from "@/hooks/use-firestore-tickets";
import { addTicket } from "@/lib/firestore-services";
import { useAuthStore } from "@/store/auth-store";
import { useOrgStore } from "@/store/org-store";
import { cn } from "@/lib/utils";
import type { OutboundChannel, TicketDirection } from "@/types";

// Auto-assign: pick the online agent with fewest active tickets (round-robin weighted)
function pickNextAgent(presenceMap: Record<string, { status: string; activeTickets: number }>, agentUsers: any[]) {
  const onlineAgents = agentUsers
    .filter((u: any) => u.role === "agent" && u.isActive)
    .map((u: any) => ({
      ...u,
      status: presenceMap[u.uid]?.status ?? "offline",
      activeTickets: presenceMap[u.uid]?.activeTickets ?? 0,
    }))
    .filter((u) => u.status === "online" || u.status === "busy") // away and offline are excluded
    .sort((a, b) => a.activeTickets - b.activeTickets);

  return onlineAgents[0] ?? null;
}

// ── Channel config ────────────────────────────────────────────────────────────
const OUTBOUND_CHANNELS: {
  id: OutboundChannel;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  description: string;
  requiresPhone: boolean;
}[] = [
  {
    id: "call",
    label: "Phone Call",
    icon: <Phone size={16} />,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    description: "Langsung dial lewat softphone",
    requiresPhone: true,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: <MessageCircle size={16} />,
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-300",
    description: "Buka percakapan WhatsApp",
    requiresPhone: true,
  },
  {
    id: "email",
    label: "Email",
    icon: <Mail size={16} />,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-300",
    description: "Kirim email ke respondent",
    requiresPhone: false,
  },
  {
    id: "instagram_dm",
    label: "Instagram DM",
    icon: <Instagram size={16} />,
    color: "text-pink-700",
    bg: "bg-pink-50",
    border: "border-pink-300",
    description: "DM via Instagram",
    requiresPhone: false,
  },
  {
    id: "facebook_dm",
    label: "Facebook DM",
    icon: <Facebook size={16} />,
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-300",
    description: "DM via Facebook Messenger",
    requiresPhone: false,
  },
  {
    id: "tiktok_dm",
    label: "TikTok DM",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.88a8.27 8.27 0 0 0 4.84 1.55V7c-.97 0-1.9-.18-2.07-.31z"/>
      </svg>
    ),
    color: "text-slate-800",
    bg: "bg-slate-50",
    border: "border-slate-300",
    description: "DM via TikTok",
    requiresPhone: false,
  },
];

function NewTicketInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { startOutbound, setView, setDialInput } = useCallStore();
  const { presence, initialized } = usePresenceStore();
  const currentUser = useAuthStore((s) => s.currentUser);
  const orgId = useOrgStore((s) => s.activeOrg?.orgId ?? "");

  // Firestore hooks
  const { respondents, loading: respLoading } = useRespondents();
  const { items: categories, loading: catLoading } = useCategories();
  const { items: leadSources, loading: lsLoading } = useLeadSources();
  const { items: users } = useUsers();

  const assignedAgent = initialized ? pickNextAgent(presence, users) : null;

  // Read directly from URL — no useState, always in sync on every render
  const respondentId     = searchParams.get("respondentId") ?? "";
  const direction        = (searchParams.get("direction") as TicketDirection) || "inbound";
  const outboundChannel  = (searchParams.get("channel") as OutboundChannel) || "";

  // Helpers to update URL params without page reload
  const setDirection = (dir: TicketDirection) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("direction", dir);
    p.delete("channel");
    router.replace(`/dashboard/tickets/new?${p.toString()}`);
  };
  const setOutboundChannel = (ch: OutboundChannel | "") => {
    const p = new URLSearchParams(searchParams.toString());
    if (ch) p.set("channel", ch); else p.delete("channel");
    router.replace(`/dashboard/tickets/new?${p.toString()}`);
  };

  const [subject, setSubject]           = useState("");
  const [priority, setPriority]         = useState("medium");
  const [categoryId, setCategoryId]     = useState("");
  const [notes, setNotes]               = useState("");
  const [scheduleType, setScheduleType] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt]   = useState("");
  const [saving, setSaving]             = useState(false);
  const [launched, setLaunched]         = useState(false);

  // Derived — from Firestore
  const respondent    = respondents.find((r) => r.respondentId === respondentId);
  const channelConfig = OUTBOUND_CHANNELS.find((c) => c.id === outboundChannel);
  const { tickets: prevTickets } = useTicketsByRespondent(respondentId || null);
  const prevChannels  = [...new Set(prevTickets.map((t) => t.leadSourceId).filter(Boolean))];
  const hasPhone      = !!respondent?.phone;
  const hasEmail      = !!respondent?.email;

  // Auto-set lead source from channel — match by name instead of hardcoded IDs
  const getLeadSourceIdByName = (name: string) =>
    leadSources.find((ls: any) => ls.name.toLowerCase() === name.toLowerCase())?.id ?? "";
  const leadSourceChannelMap: Record<OutboundChannel, string> = {
    call: "Call", whatsapp: "WhatsApp", email: "Email",
    instagram_dm: "Instagram", facebook_dm: "Facebook", tiktok_dm: "TikTok",
  };
  const [leadSourceId, setLeadSourceId] = useState("");
  useEffect(() => {
    if (direction === "outbound" && outboundChannel && leadSources.length > 0) {
      const name = leadSourceChannelMap[outboundChannel] ?? "";
      setLeadSourceId(getLeadSourceIdByName(name));
    }
    setLaunched(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outboundChannel, direction, leadSources]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleLaunchChannel = () => {
    if (!respondent) return;

    if (outboundChannel === "call" && respondent.phone) {
      setDialInput(respondent.phone);
      startOutbound(respondent.phone);
      setView("active");
      setLaunched(true);
    } else if (outboundChannel === "whatsapp" && respondent.phone) {
      const num = respondent.phone.replace(/[^0-9]/g, "");
      const msg = encodeURIComponent(`Halo ${respondent.fullName}, saya dari tim pelayanan kami. ${notes}`);
      window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
      setLaunched(true);
    } else if (outboundChannel === "email" && respondent.email) {
      const body = encodeURIComponent(notes || `Halo ${respondent.fullName},\n\nSaya dari tim pelayanan kami.`);
      window.open(`mailto:${respondent.email}?subject=${encodeURIComponent(subject)}&body=${body}`, "_blank");
      setLaunched(true);
    } else if (outboundChannel === "instagram_dm") {
      window.open("https://www.instagram.com/direct/inbox/", "_blank");
      setLaunched(true);
    } else if (outboundChannel === "facebook_dm") {
      window.open("https://www.facebook.com/messages/", "_blank");
      setLaunched(true);
    } else if (outboundChannel === "tiktok_dm") {
      window.open("https://www.tiktok.com/messages", "_blank");
      setLaunched(true);
    }
  };

  const handleSave = async () => {
    if (!respondentId || !subject.trim()) return;
    setSaving(true);
    try {
      await addTicket(orgId, {
        respondentId,
        subject: subject.trim(),
        priority: priority as any,
        categoryId: categoryId || undefined,
        leadSourceId: leadSourceId || undefined,
        assignedAgentId: assignedAgent?.uid ?? undefined,
        initialNote: notes.trim() || undefined,
      }, currentUser?.uid ?? "unknown");
      router.push("/dashboard/tickets");
    } catch (err) {
      console.error("Failed to create ticket:", err);
      setSaving(false);
    }
  };

  const canLaunch = !!respondent && !!outboundChannel && (
    (outboundChannel === "call"         && hasPhone) ||
    (outboundChannel === "whatsapp"     && hasPhone) ||
    (outboundChannel === "email"        && hasEmail) ||
    outboundChannel === "instagram_dm"               ||
    outboundChannel === "facebook_dm"                ||
    outboundChannel === "tiktok_dm"
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        {respondent ? (
          <Link
            href={`/dashboard/respondents/${respondentId}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={14} />{respondent.fullName}
          </Link>
        ) : (
          <Link
            href="/dashboard/tickets"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={14} />Tickets
          </Link>
        )}
        <span className="text-muted-foreground/40 text-xs">/</span>
        <span className="text-xs text-foreground font-medium">New Ticket</span>
      </div>

      {/* Direction toggle */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setDirection("inbound")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
            direction === "inbound"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ArrowDownLeft size={14} />
          Inbound
        </button>
        <button
          onClick={() => setDirection("outbound")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
            direction === "outbound"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ArrowUpRight size={14} />
          Outbound Follow-up
        </button>
      </div>

      {/* ── OUTBOUND MODE ── */}
      {direction === "outbound" && (
        <div className="flex flex-col gap-4">

          {/* Step 1 — Respondent (already selected, read-only) */}
          <Card className="border border-border shadow-none">
            <CardHeader className="px-5 pt-5 pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">1</span>
                Respondent
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex flex-col gap-3">
              {/* Respondent info card — always shown (no selector) */}
              {respondent && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                    {respondent.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{respondent.fullName}</span>
                      {respondent.progress && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{respondent.progress}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {respondent.phone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                          <Phone size={10} />{respondent.phone}
                        </span>
                      )}
                      {respondent.email && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail size={10} />{respondent.email}
                        </span>
                      )}
                      {respondent.city && (
                        <span className="text-xs text-muted-foreground">{respondent.city}</span>
                      )}
                    </div>
                    {/* Previous tickets */}
                    {prevTickets.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">{prevTickets.length} ticket sebelumnya:</span>
                        {prevChannels.map((lsId) => {
                          const ls = leadSources.find((l: any) => l.id === lsId || l.leadSourceId === lsId);
                          return (
                            <span key={lsId} className="text-[10px] px-1.5 py-0.5 rounded-full bg-background border border-border text-muted-foreground">
                              {ls?.name ?? lsId}
                            </span>
                          );
                        })}
                        <Link
                          href={`/dashboard/respondents/${respondentId}`}
                          className="text-[10px] text-primary hover:underline flex items-center gap-0.5 ml-auto"
                        >
                          Lihat profil <ExternalLink size={8} />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2 — Pilih Channel */}
          <Card className="border border-border shadow-none">
            <CardHeader className="px-5 pt-5 pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">2</span>
                Pilih Channel Kontak
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {OUTBOUND_CHANNELS.map((ch) => {
                  const unavailable =
                    (ch.requiresPhone && !hasPhone && !!respondent) ||
                    (ch.id === "email" && !hasEmail && !!respondent);
                  return (
                    <button
                      key={ch.id}
                      disabled={unavailable}
                      onClick={() => setOutboundChannel(ch.id)}
                      className={cn(
                        "flex flex-col items-start gap-1.5 p-3 rounded-lg border-2 text-left transition-all",
                        outboundChannel === ch.id
                          ? `${ch.bg} ${ch.border} ${ch.color}`
                          : "bg-background border-border hover:border-muted-foreground/30 text-foreground",
                        unavailable && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <div className={cn("flex items-center gap-1.5 font-semibold text-xs", outboundChannel === ch.id ? ch.color : "text-foreground")}>
                        {ch.icon} {ch.label}
                      </div>
                      <span className="text-[10px] text-muted-foreground leading-tight">{ch.description}</span>
                      {unavailable && (
                        <span className="text-[9px] text-red-500 font-medium">
                          {ch.id === "email" ? "Tidak ada email" : "Tidak ada nomor"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Launch button */}
              {channelConfig && respondent && (
                <div className={cn(
                  "mt-4 flex items-center gap-3 p-3 rounded-lg border",
                  launched ? "bg-emerald-50 border-emerald-200" : `${channelConfig.bg} ${channelConfig.border}`
                )}>
                  {launched ? (
                    <>
                      <Check size={14} className="text-emerald-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-emerald-700">
                          {channelConfig.label} sudah dibuka
                        </p>
                        <p className="text-[10px] text-emerald-600 mt-0.5">Lanjutkan untuk membuat tiket dari percakapan ini.</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                        onClick={handleLaunchChannel}
                      >
                        Buka lagi
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className={cn("flex-shrink-0", channelConfig.color)}>{channelConfig.icon}</div>
                      <div className="flex-1">
                        <p className={cn("text-xs font-semibold", channelConfig.color)}>
                          Hubungi {respondent.fullName} via {channelConfig.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {outboundChannel === "call"         && respondent.phone && `Dial ${respondent.phone}`}
                          {outboundChannel === "whatsapp"     && respondent.phone && `wa.me/${respondent.phone.replace(/[^0-9]/g, "")}`}
                          {outboundChannel === "email"        && respondent.email && respondent.email}
                          {outboundChannel === "instagram_dm" && "Buka Instagram DM di browser baru"}
                          {outboundChannel === "facebook_dm"  && "Buka Facebook Messenger di browser baru"}
                          {outboundChannel === "tiktok_dm"    && "Buka TikTok DM di browser baru"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className={cn("h-7 text-xs text-white", {
                          "bg-emerald-600 hover:bg-emerald-700": outboundChannel === "call",
                          "bg-green-600 hover:bg-green-700":     outboundChannel === "whatsapp",
                          "bg-blue-600 hover:bg-blue-700":       outboundChannel === "email",
                          "bg-pink-600 hover:bg-pink-700":       outboundChannel === "instagram_dm",
                          "bg-indigo-600 hover:bg-indigo-700":   outboundChannel === "facebook_dm",
                          "bg-slate-800 hover:bg-slate-900":     outboundChannel === "tiktok_dm",
                        })}
                        disabled={!canLaunch}
                        onClick={handleLaunchChannel}
                      >
                        <Zap size={11} className="mr-1" />
                        {outboundChannel === "call"         ? "Dial Sekarang"  :
                         outboundChannel === "whatsapp"     ? "Buka WhatsApp"  :
                         outboundChannel === "email"        ? "Buka Email"     :
                         outboundChannel === "instagram_dm" ? "Buka Instagram" :
                         outboundChannel === "facebook_dm"  ? "Buka Facebook"  :
                         outboundChannel === "tiktok_dm"    ? "Buka TikTok"    :
                                                              "Buka DM"}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Scheduling */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Follow-up:</span>
                {(["now", "later"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setScheduleType(t)}
                    className={cn(
                      "flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors",
                      scheduleType === t
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-border text-muted-foreground hover:border-muted-foreground/40"
                    )}
                  >
                    {t === "now" ? <><Zap size={9} />Sekarang</> : <><CalendarDays size={9} />Jadwalkan</>}
                  </button>
                ))}
                {scheduleType === "later" && (
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="h-7 text-xs border border-border rounded-md px-2 bg-background text-foreground"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 3 — Detail Tiket */}
          <Card className="border border-border shadow-none">
            <CardHeader className="px-5 pt-5 pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">3</span>
                Detail Tiket
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Subjek / Tujuan Follow-up *</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Contoh: Follow-up doa keselamatan, tindak lanjut konseling..." className="h-9 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Prioritas</label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Kategori</label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih kategori..." /></SelectTrigger>
                    <SelectContent>
                      {categories.filter((c: any) => c.isActive).map((c) => (
                        <SelectItem key={c.id || c.categoryId} value={c.id || c.categoryId}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Pesan / Catatan Awal</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tambahkan konteks, hasil percakapan, atau pesan awal yang akan dikirim..."
                  className="text-sm resize-none min-h-[80px]"
                />
                {outboundChannel === "whatsapp" && notes && (
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Info size={9} />Pesan ini akan otomatis masuk ke link WhatsApp saat kamu klik "Buka WhatsApp".
                  </p>
                )}
              </div>

              {/* Auto-assign preview */}
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg border text-xs",
                assignedAgent
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              )}>
                <User size={13} className="flex-shrink-0" />
                {assignedAgent ? (
                  <div className="flex-1">
                    <span className="font-semibold">Auto-assign: </span>
                    <span>{assignedAgent.displayName}</span>
                    <span className="ml-2 text-[10px] opacity-70">
                      ({presence[assignedAgent.uid]?.activeTickets ?? 0} tiket aktif)
                    </span>
                  </div>
                ) : (
                  <span className="flex-1">Tidak ada agent online. Tiket akan masuk ke antrian.</span>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" asChild><Link href="/dashboard/tickets">Batal</Link></Button>
                <Button
                  size="sm"
                  disabled={!respondentId || !subject.trim() || saving}
                  onClick={handleSave}
                >
                  {saving
                    ? <><Check size={13} className="mr-1.5" />Menyimpan...</>
                    : <><Send size={13} className="mr-1.5" />Buat Tiket Follow-up</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── INBOUND MODE ── */}
      {direction === "inbound" && (
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3 px-5 pt-5 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowDownLeft size={14} className="text-primary" />Tiket Masuk (Inbound)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 flex flex-col gap-4">
            {/* Respondent — read-only, pre-filled from profile */}
            {respondent ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                  {respondent.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{respondent.fullName}</span>
                    {respondent.progress && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{respondent.progress}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {respondent.phone && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        <Phone size={10} />{respondent.phone}
                      </span>
                    )}
                    {respondent.city && (
                      <span className="text-xs text-muted-foreground">{respondent.city}</span>
                    )}
                    {prevTickets.length > 0 && (
                      <span className="text-xs text-muted-foreground">{prevTickets.length} tiket sebelumnya</span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/dashboard/respondents/${respondentId}`}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline flex-shrink-0"
                >
                  Profil <ExternalLink size={9} />
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-dashed border-border animate-pulse">
                <div className="w-9 h-9 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-3 bg-muted rounded w-1/3" />
                  <div className="h-2.5 bg-muted rounded w-1/2" />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Subject *</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Deskripsi singkat tiket..." className="h-9 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Prioritas</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Masuk via (Channel)</label>
                <Select value={leadSourceId} onValueChange={setLeadSourceId}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih channel..." /></SelectTrigger>
                  <SelectContent>
                    {leadSources.filter((ls: any) => ls.isActive).map((ls) => (
                      <SelectItem key={ls.id || ls.leadSourceId} value={ls.id || ls.leadSourceId}>{ls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Kategori</label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih kategori..." /></SelectTrigger>
                  <SelectContent>
                    {categories.filter((c: any) => c.isActive).map((c) => (
                      <SelectItem key={c.id || c.categoryId} value={c.id || c.categoryId}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Catatan Awal</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tambahkan konteks atau pesan awal..." className="text-sm resize-none min-h-[80px]" />
            </div>

            {/* Auto-assign preview */}
            <div className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg border text-xs",
              assignedAgent
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
            )}>
              <User size={13} className="flex-shrink-0" />
              {assignedAgent ? (
                <div className="flex-1">
                  <span className="font-semibold">Auto-assign: </span>
                  <span>{assignedAgent.displayName}</span>
                    <span className="ml-2 text-[10px] opacity-70">
                      ({presence[assignedAgent.uid]?.activeTickets ?? 0} tiket aktif)
                    </span>
                </div>
              ) : (
                <span className="flex-1">Tidak ada agent online. Tiket akan masuk ke antrian.</span>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" asChild><Link href="/dashboard/tickets">Batal</Link></Button>
              <Button size="sm" disabled={!respondentId || !subject.trim() || saving} onClick={handleSave}>
                {saving ? <><Check size={13} className="mr-1.5" />Menyimpan...</> : "Buat Tiket"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-sm">Memuat formulir...</span>
        </div>
      </div>
    }>
      <NewTicketInner />
    </Suspense>
  );
}
