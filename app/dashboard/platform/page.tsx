"use client";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2, Users, Ticket, Crown, Search, ArrowUpRight,
  Calendar, TrendingUp, Shield, Globe, BarChart2, Eye,
  ChevronDown, ChevronUp, Mail, Clock, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OrgData {
  orgId: string;
  name: string;
  slug: string;
  plan: string;
  billingEmail: string;
  createdAt: any;
  isActive: boolean;
  usage: {
    currentUsers: number;
    currentRespondents: number;
    aiConversationsThisMonth: number;
    waConversationsThisMonth: number;
  };
}

interface UserData {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  isActive: boolean;
  primaryOrgId: string;
  createdAt: any;
  isPlatformAdmin?: boolean;
}

const PLAN_COLORS: Record<string, string> = {
  free: "#6B7280",
  starter: "#2563EB",
  growth: "#7C3AED",
  enterprise: "#D97706",
};

export default function PlatformAdminPage() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [orgs, setOrgs] = useState<OrgData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "orgs" | "users">("overview");
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);

  // Check platform admin access
  useEffect(() => {
    if (currentUser && !currentUser.isPlatformAdmin) {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  // Load all data
  useEffect(() => {
    if (!currentUser?.isPlatformAdmin) return;
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ collection, getDocs, query, orderBy }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("@/lib/firebase"),
      ]);

      // Fetch all organizations
      const orgSnap = await getDocs(query(collection(db, "organizations"), orderBy("createdAt", "desc")));
      const orgList = orgSnap.docs.map((d) => {
        const data = d.data();
        return {
          orgId: d.id,
          name: data.name ?? "",
          slug: data.slug ?? d.id,
          plan: data.plan ?? "free",
          billingEmail: data.billingEmail ?? "",
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
          isActive: data.isActive ?? true,
          usage: {
            currentUsers: data.usage?.currentUsers ?? 0,
            currentRespondents: data.usage?.currentRespondents ?? 0,
            aiConversationsThisMonth: data.usage?.aiConversationsThisMonth ?? 0,
            waConversationsThisMonth: data.usage?.waConversationsThisMonth ?? 0,
          },
        } as OrgData;
      });
      setOrgs(orgList);

      // Fetch all users
      const userSnap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
      const userList = userSnap.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          displayName: data.displayName ?? "",
          email: data.email ?? "",
          role: data.role ?? "agent",
          isActive: data.isActive ?? true,
          primaryOrgId: data.primaryOrgId ?? "",
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
          isPlatformAdmin: data.isPlatformAdmin ?? false,
        } as UserData;
      });
      setUsers(userList);
    } catch (err) {
      console.error("Failed to load platform data:", err);
    }
    setLoading(false);
  };

  if (!currentUser?.isPlatformAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Shield size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Access denied. Platform admin only.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading platform data...</p>
        </div>
      </div>
    );
  }

  // Stats
  const totalOrgs = orgs.length;
  const totalUsers = users.length;
  const totalRespondents = orgs.reduce((sum, o) => sum + o.usage.currentRespondents, 0);
  const paidOrgs = orgs.filter((o) => o.plan !== "free").length;
  const planBreakdown = {
    free: orgs.filter((o) => o.plan === "free").length,
    starter: orgs.filter((o) => o.plan === "starter").length,
    growth: orgs.filter((o) => o.plan === "growth").length,
    enterprise: orgs.filter((o) => o.plan === "enterprise").length,
  };

  // Recent signups (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentOrgs = orgs.filter((o) => new Date(o.createdAt) > sevenDaysAgo);
  const recentUsers = users.filter((u) => new Date(u.createdAt) > sevenDaysAgo);

  // Search filter
  const filteredOrgs = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.billingEmail.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = users.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.primaryOrgId.toLowerCase().includes(search.toLowerCase())
  );

  const getOrgName = (orgId: string) => orgs.find((o) => o.orgId === orgId)?.name ?? orgId;

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Shield size={20} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Platform Admin</h2>
            <p className="text-xs text-muted-foreground">Monitor all organizations, users, and platform activity.</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={loadData}>
          <Activity size={14} className="mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground">Total Organizations</p>
              <Building2 size={14} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{totalOrgs}</p>
            <p className="text-[10px] text-green-600 mt-1">+{recentOrgs.length} this week</p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground">Total Users</p>
              <Users size={14} className="text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
            <p className="text-[10px] text-green-600 mt-1">+{recentUsers.length} this week</p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground">Paid Organizations</p>
              <Crown size={14} className="text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{paidOrgs}</p>
            <p className="text-[10px] text-muted-foreground mt-1">of {totalOrgs} total</p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground">Total Respondents</p>
              <Globe size={14} className="text-teal-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{totalRespondents.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">across all orgs</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Breakdown */}
      <Card className="shadow-none">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-foreground mb-3">Plan Distribution</p>
          <div className="flex gap-3">
            {Object.entries(planBreakdown).map(([plan, count]) => (
              <div key={plan} className="flex-1 text-center p-3 rounded-lg" style={{ backgroundColor: PLAN_COLORS[plan] + "10" }}>
                <p className="text-lg font-bold" style={{ color: PLAN_COLORS[plan] }}>{count}</p>
                <p className="text-[10px] font-medium capitalize" style={{ color: PLAN_COLORS[plan] }}>{plan}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        {[
          { id: "overview" as const, label: "Recent Activity" },
          { id: "orgs" as const, label: `Organizations (${totalOrgs})` },
          { id: "users" as const, label: `Users (${totalUsers})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
              activeTab === tab.id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search organizations or users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Recent signups (last 7 days)</h3>
          {recentOrgs.length === 0 && recentUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No new signups this week.</p>
          ) : (
            <div className="space-y-2">
              {[...recentOrgs.map((o) => ({
                type: "org" as const,
                name: o.name,
                detail: o.billingEmail,
                plan: o.plan,
                date: o.createdAt,
              })), ...recentUsers.map((u) => ({
                type: "user" as const,
                name: u.displayName,
                detail: `${u.email} → ${getOrgName(u.primaryOrgId)}`,
                plan: null,
                date: u.createdAt,
              }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    item.type === "org" ? "bg-blue-50" : "bg-purple-50"
                  )}>
                    {item.type === "org" ? <Building2 size={14} className="text-blue-500" /> : <Users size={14} className="text-purple-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{item.detail}</p>
                  </div>
                  {item.plan && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white capitalize" style={{ backgroundColor: PLAN_COLORS[item.plan] }}>
                      {item.plan}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Organizations Tab */}
      {activeTab === "orgs" && (
        <div className="space-y-2">
          {filteredOrgs.map((org) => (
            <Card key={org.orgId} className="shadow-none">
              <CardContent className="p-0">
                <button
                  onClick={() => setExpandedOrg(expandedOrg === org.orgId ? null : org.orgId)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: PLAN_COLORS[org.plan] }}>
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{org.name}</p>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white capitalize" style={{ backgroundColor: PLAN_COLORS[org.plan] }}>
                        {org.plan}
                      </span>
                      {!org.isActive && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">INACTIVE</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{org.billingEmail}</p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1"><Users size={11} /> {org.usage.currentUsers}</span>
                    <span className="flex items-center gap-1"><Globe size={11} /> {org.usage.currentRespondents}</span>
                    <span>{new Date(org.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    {expandedOrg === org.orgId ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {expandedOrg === org.orgId && (
                  <div className="px-4 pb-4 border-t border-border">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      <div className="p-3 rounded-lg bg-muted/30">
                        <p className="text-[10px] text-muted-foreground">Users</p>
                        <p className="text-lg font-bold text-foreground">{org.usage.currentUsers}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30">
                        <p className="text-[10px] text-muted-foreground">Respondents</p>
                        <p className="text-lg font-bold text-foreground">{org.usage.currentRespondents}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30">
                        <p className="text-[10px] text-muted-foreground">AI Conv. (this month)</p>
                        <p className="text-lg font-bold text-foreground">{org.usage.aiConversationsThisMonth}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30">
                        <p className="text-[10px] text-muted-foreground">WA Conv. (this month)</p>
                        <p className="text-lg font-bold text-foreground">{org.usage.waConversationsThisMonth}</p>
                      </div>
                    </div>

                    {/* Plan Management */}
                    <div className="mt-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
                      <p className="text-[10px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <Crown size={11} className="text-amber-500" /> Plan Management
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-[9px] text-muted-foreground uppercase tracking-wide block mb-1">Current Plan</label>
                          <select
                            value={org.plan}
                            onChange={async (e) => {
                              const newPlan = e.target.value;
                              try {
                                const [{ doc, updateDoc, serverTimestamp }, { db }] = await Promise.all([
                                  import("firebase/firestore"), import("@/lib/firebase"),
                                ]);
                                await updateDoc(doc(db, "organizations", org.orgId), {
                                  plan: newPlan,
                                  updatedAt: serverTimestamp(),
                                });
                                setOrgs((prev) => prev.map((o) => o.orgId === org.orgId ? { ...o, plan: newPlan } : o));
                              } catch (err) {
                                console.error("Failed to update plan:", err);
                                alert("Failed to update plan. Please try again.");
                              }
                            }}
                            className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs font-semibold capitalize"
                          >
                            <option value="free">Free ($0)</option>
                            <option value="starter">Starter ($29/mo)</option>
                            <option value="growth">Growth ($79/mo)</option>
                            <option value="enterprise">Enterprise ($249+/mo)</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] text-muted-foreground uppercase tracking-wide block mb-1">Status</label>
                          <button
                            onClick={async () => {
                              const newStatus = !org.isActive;
                              try {
                                const [{ doc, updateDoc, serverTimestamp }, { db }] = await Promise.all([
                                  import("firebase/firestore"), import("@/lib/firebase"),
                                ]);
                                await updateDoc(doc(db, "organizations", org.orgId), {
                                  isActive: newStatus,
                                  updatedAt: serverTimestamp(),
                                });
                                setOrgs((prev) => prev.map((o) => o.orgId === org.orgId ? { ...o, isActive: newStatus } : o));
                              } catch (err) {
                                console.error("Failed to toggle status:", err);
                              }
                            }}
                            className={cn(
                              "w-full h-8 rounded-md text-xs font-semibold transition-colors",
                              org.isActive
                                ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-200"
                                : "bg-red-100 text-red-700 border border-red-300 hover:bg-red-200"
                            )}
                          >
                            {org.isActive ? "✓ Active" : "✕ Inactive"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar size={11} /> Created: {new Date(org.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Mail size={11} /> {org.billingEmail}
                      </p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <p className="text-[10px] font-medium text-foreground">Team members in this org:</p>
                    </div>
                    <div className="mt-2 space-y-1">
                      {users.filter((u) => u.primaryOrgId === org.orgId).map((u) => (
                        <div key={u.uid} className="flex items-center gap-2 text-[11px] p-1.5 rounded bg-muted/20">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                            {u.displayName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground">{u.displayName}</span>
                          <span className="text-muted-foreground">{u.email}</span>
                          <span className="ml-auto text-[9px] font-bold capitalize px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{u.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_1fr_120px_80px_100px] gap-2 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Name</span>
            <span>Email</span>
            <span>Organization</span>
            <span>Role</span>
            <span>Joined</span>
          </div>
          {filteredUsers.map((u) => (
            <div key={u.uid} className="grid grid-cols-[1fr_1fr_120px_80px_100px] gap-2 px-3 py-2.5 rounded-lg border border-border items-center">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                  {u.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {u.displayName}
                    {u.isPlatformAdmin && <span className="ml-1 text-[9px] text-amber-600">★ PLATFORM ADMIN</span>}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
              <p className="text-[11px] text-foreground truncate">{getOrgName(u.primaryOrgId)}</p>
              <span className="text-[10px] font-bold capitalize px-1.5 py-0.5 rounded bg-muted text-muted-foreground w-fit">{u.role}</span>
              <p className="text-[10px] text-muted-foreground">
                {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
