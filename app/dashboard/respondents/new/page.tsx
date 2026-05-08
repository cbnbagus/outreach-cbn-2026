"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, AlertTriangle, Phone, User, Ticket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLeadSources } from "@/hooks/use-firestore-config";
import { useRespondents } from "@/hooks/use-firestore-respondents";
import { useTickets } from "@/hooks/use-firestore-tickets";
import { addRespondent } from "@/lib/firestore-services";
import { useAuthStore } from "@/store/auth-store";
import { useOrgStore } from "@/store/org-store";
import { TicketStatusBadge } from "@/components/tickets/TicketStatusBadge";
import { cn } from "@/lib/utils";

export default function NewRespondentPage() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const orgId = useOrgStore((s) => s.activeOrg?.orgId ?? "");
  const { items: leadSources, loading: lsLoading } = useLeadSources();
  const { respondents, loading: respLoading } = useRespondents();
  const { tickets, loading: ticketsLoading } = useTickets();

  const [fullName,     setFullName]     = useState("");
  const [phone,        setPhone]        = useState("");
  const [email,        setEmail]        = useState("");
  const [leadSourceId, setLeadSourceId] = useState("");
  const [notes,        setNotes]        = useState("");
  const [saving,       setSaving]       = useState(false);
  const [dismissed,    setDismissed]    = useState(false);

  // Phone duplicate lookup from Firestore respondents
  const normalizedPhone = phone.replace(/[^0-9+]/g, "");
  const matchedRespondent = normalizedPhone.length >= 6
    ? respondents.find((r) => r.phone && r.phone.replace(/[^0-9+]/g, "").includes(normalizedPhone))
    : null;
  const matchedTickets = matchedRespondent
    ? tickets.filter((t) => t.respondentId === matchedRespondent.respondentId)
    : [];
  const showDuplicate = !!matchedRespondent && !dismissed;

  const handleSave = async () => {
    if (!fullName.trim() || !leadSourceId) return;
    setSaving(true);
    try {
      await addRespondent(orgId, {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        leadSourceId,
        notes: notes.trim() || undefined,
      }, currentUser?.uid ?? "unknown");
      router.push("/dashboard/respondents");
    } catch (err) {
      console.error("Failed to create respondent:", err);
      setSaving(false);
    }
  };

  if (lsLoading || respLoading || ticketsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/respondents" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={14} />Respondents
        </Link>
        <span className="text-muted-foreground/40 text-xs">/</span>
        <span className="text-xs text-foreground font-medium">New Respondent</span>
      </div>

      {/* Duplicate warning banner */}
      {showDuplicate && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">
                Existing respondent found with this phone number
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                <strong>{matchedRespondent!.fullName}</strong> already has{" "}
                {matchedTickets.length} ticket{matchedTickets.length !== 1 ? "s" : ""}.
                Creating a new respondent may cause duplicates.
              </p>

              {/* Cross-channel ticket history */}
              <div className="mt-3 flex flex-col gap-1.5">
                {matchedTickets.slice(0, 3).map((t) => (
                  <Link
                    key={t.ticketId}
                    href={`/dashboard/tickets/${t.ticketId}`}
                    className="flex items-center gap-2 text-xs text-amber-800 hover:text-amber-900 group"
                  >
                    <Ticket size={10} className="flex-shrink-0" />
                    <span className="font-mono">{t.ticketNumber}</span>
                    <span className="text-amber-600 truncate">{t.subject}</span>
                    <TicketStatusBadge status={t.status} />
                    <ArrowRight size={9} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>

              <div className="flex gap-2 mt-3">
                <Link
                  href={`/dashboard/respondents/${matchedRespondent!.respondentId}`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors flex items-center gap-1.5"
                >
                  <User size={11} /> View Existing Profile
                </Link>
                <button
                  onClick={() => setDismissed(true)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  Create Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card className="border border-border shadow-none">
        <CardHeader className="pb-3 px-5 pt-5 border-b border-border">
          <CardTitle className="text-sm font-semibold">New Respondent</CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Phone number is matched across all channels — WhatsApp, Call, SMS — to prevent duplicates.
          </p>
        </CardHeader>
        <CardContent className="p-5 flex flex-col gap-4">

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Full Name *</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Rina Susanti" className="h-9 text-sm" />
          </div>

          {/* Phone with live duplicate check */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Phone Number</label>
            <div className="relative">
              <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setDismissed(false); }}
                placeholder="+62 812 3456 7890"
                className={cn("h-9 text-sm pl-8",
                  matchedRespondent && !dismissed && "border-amber-400 focus-visible:ring-amber-300"
                )}
              />
              {matchedRespondent && !dismissed && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-amber-600 flex items-center gap-1">
                  <AlertTriangle size={10} /> Duplicate
                </span>
              )}
              {normalizedPhone.length >= 6 && !matchedRespondent && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600">
                  No match
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="h-9 text-sm" />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Lead Source *</label>
            <Select value={leadSourceId} onValueChange={setLeadSourceId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="How did they find us?" /></SelectTrigger>
              <SelectContent>
                {leadSources.filter((ls: any) => ls.isActive).map((ls: any) => (
                  <SelectItem key={ls.id || ls.leadSourceId} value={ls.id || ls.leadSourceId}>{ls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any context about this respondent..." className="text-sm resize-none min-h-[70px]" />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" asChild><Link href="/dashboard/respondents">Cancel</Link></Button>
            <Button
              size="sm"
              disabled={!fullName.trim() || !leadSourceId || saving || (!!matchedRespondent && !dismissed)}
              onClick={handleSave}
            >
              {saving ? <><Check size={13} className="mr-1.5" />Saving...</> : "Create Respondent"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
