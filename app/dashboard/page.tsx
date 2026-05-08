"use client";
import Link from "next/link";
import { Ticket, Users, CheckCircle2, Clock, AlertCircle, Plus, ArrowRight, Bot, ShieldAlert, Zap, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/tickets/TicketStatusBadge";
import { useTickets } from "@/hooks/use-firestore-tickets";
import { useRespondents } from "@/hooks/use-firestore-respondents";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

export default function OverviewPage() {
  const { tickets, loading: ticketsLoading } = useTickets();
  const { respondents, loading: respLoading } = useRespondents();
  const currentUser = useAuthStore((s) => s.currentUser);
  const firstName   = currentUser?.displayName?.split(" ")[0] ?? "there";

  if (ticketsLoading || respLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Compute stats from real data
  const openCount       = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount   = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
  const respondentCount = respondents.length;

  const stats = [
    { label: "Open Tickets", value: openCount, icon: AlertCircle, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "In Progress", value: inProgressCount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Resolved", value: resolvedCount, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Respondents", value: respondentCount, icon: Users, color: "text-primary", bg: "bg-primary/5" },
  ];

  const recentTickets = tickets.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground text-balance">Welcome back, {firstName}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Here is your outreach summary for today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/respondents/new">
              <Plus size={14} className="mr-1.5" />New Respondent
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard/tickets/new">
              <Plus size={14} className="mr-1.5" />New Ticket
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border border-border shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                    <Icon size={18} className={s.color} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI Integration Status Widget */}
      <Card className="border border-border shadow-none">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Bot size={14} className="text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">AI Integration</CardTitle>
              <p className="text-[10px] text-muted-foreground">AI First, Human on Demand</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border bg-muted border-border text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
              Coming Soon
            </span>
            <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
              <Link href="/dashboard/admin/ai-settings">
                <Settings size={11} className="mr-1" />Configure
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Handled by AI Today", value: "—", icon: Bot, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Escalated Today", value: "—", icon: ShieldAlert, color: "text-orange-600", bg: "bg-orange-50" },
              { label: "Avg. AI Response", value: "—", icon: Zap, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Escalation Rate", value: "—", icon: ShieldAlert, color: "text-amber-600", bg: "bg-amber-50" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                  <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={14} className={s.color} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-2">AI Integration</p>
            <p className="text-xs text-muted-foreground">AI auto-reply and escalation triggers will be available after integration setup.</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Tickets */}
      <Card className="border border-border shadow-none">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Recent Tickets</CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
            <Link href="/dashboard/tickets">
              View all <ArrowRight size={12} className="ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentTickets.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">No tickets yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-2.5">Ticket</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">Respondent</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">Subject</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">Priority</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">Agent</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.map((ticket) => (
                  <tr key={ticket.ticketId} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/dashboard/tickets/${ticket.ticketId}`} className="text-primary font-mono text-xs font-semibold hover:underline">
                        {ticket.ticketNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground">{ticket.respondentName ?? "—"}</td>
                    <td className="px-3 py-3 text-sm text-muted-foreground max-w-[220px] truncate">{ticket.subject}</td>
                    <td className="px-3 py-3"><TicketStatusBadge status={ticket.status} /></td>
                    <td className="px-3 py-3"><TicketPriorityBadge priority={ticket.priority} /></td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{ticket.assignedAgentName ?? <span className="italic text-muted-foreground/50">Unassigned</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
