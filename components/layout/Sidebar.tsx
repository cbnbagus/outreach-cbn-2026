"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Ticket, MessageSquare,
  BarChart2, Settings, Tag, Globe, CheckCircle2,
  ChevronDown, UserCog, LogOut, Plug, CircleUser, X, CalendarDays, Bot, PhoneCall, Shield, Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import { useState, useEffect } from "react";
import { PresenceDot } from "@/components/presence/PresenceDot";
import { usePresenceStore } from "@/store/presence-store";
import { useCallStore } from "@/store/call-store";

import { useOrgStore } from "@/store/org-store";
import { useAuthStore } from "@/store/auth-store";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  children?: { label: string; href: string; icon: React.ElementType }[];
}

const navItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, roles: ["agent", "supervisor", "admin"] },
  { label: "Respondents", href: "/dashboard/respondents", icon: Users, roles: ["agent", "supervisor", "admin"] },
  { label: "Tickets", href: "/dashboard/tickets", icon: Ticket, roles: ["agent", "supervisor", "admin"] },
  { label: "Calls",        href: "/dashboard/calls",        icon: PhoneCall,     roles: ["agent", "supervisor", "admin"] },
  { label: "Schedule",     href: "/dashboard/schedule",     icon: CalendarDays,  roles: ["agent", "supervisor", "admin"] },
  { label: "Team",     href: "/dashboard/team",     icon: Users,        roles: ["agent", "supervisor", "admin"] },
  { label: "Reports",  href: "/dashboard/reports",  icon: BarChart2,    roles: ["supervisor", "admin"] },
  { label: "AI Settings", href: "/dashboard/admin/ai-settings", icon: Bot, roles: ["supervisor", "admin"] },
  {
    label: "Admin", href: "/dashboard/admin", icon: Settings, roles: ["admin"],
    children: [
      { label: "Users", href: "/dashboard/admin/users", icon: UserCog },
      { label: "Categories", href: "/dashboard/admin/categories", icon: Tag },
      { label: "Lead Sources", href: "/dashboard/admin/lead-sources", icon: Globe },
      { label: "Program Sources", href: "/dashboard/admin/program-sources", icon: Radio },
      { label: "Outcomes", href: "/dashboard/admin/outcomes", icon: CheckCircle2 },
      { label: "Integrations", href: "/dashboard/admin/integrations",    icon: Plug },
      { label: "Social Accounts", href: "/dashboard/admin/social-accounts", icon: Globe },
      { label: "AI Settings",  href: "/dashboard/admin/ai-settings",    icon: Bot },
      { label: "Call Settings", href: "/dashboard/admin/call-settings", icon: PhoneCall },
    ],
  },
];

interface SidebarProps {
  role:       UserRole;
  userName:   string;
  onLogout:   () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ role, userName, onLogout, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname    = usePathname();
  const isInAdmin   = pathname.startsWith("/dashboard/admin");
  const [adminOpen, setAdminOpen] = useState(true);
  const { getOnlineCount, initialized } = usePresenceStore();
  const onlineCount  = initialized ? getOnlineCount() : 0;
  const { missedCount } = useCallStore();
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const isPlatformAdmin = useAuthStore((s) => s.currentUser?.isPlatformAdmin ?? false);

  // Close mobile drawer on route change
  useEffect(() => { onMobileClose(); }, [pathname]);

  // Always open admin accordion when navigating to an admin page
  useEffect(() => { if (isInAdmin) setAdminOpen(true); }, [isInAdmin]);

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}
    <aside className={cn(
      "flex flex-col w-60 min-h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-shrink-0",
      "fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:static lg:translate-x-0",
      mobileOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Logo — CBN branding */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-sidebar-border">
        <Image
          src="/cbn-logo.png"
          alt="CBN"
          width={80}
          height={32}
          className="h-7 w-auto flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-white/70 leading-tight truncate">{activeOrg?.name ?? "CBN Outreach"}</p>
          <p className="text-[9px] text-sidebar-foreground/40 leading-tight">Outreach Management</p>
        </div>
        <button
          className="lg:hidden p-1 rounded text-sidebar-foreground/60 hover:text-white transition-colors"
          onClick={onMobileClose}
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const hasChildren = item.children && item.children.length > 0;

          if (hasChildren) {
            return (
              <div key={item.href}>
                <button
                  onClick={() => setAdminOpen((o) => !o)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-white"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </span>
                  <ChevronDown size={13} className={cn("transition-transform", adminOpen && "rotate-180")} />
                </button>
                {adminOpen && (
                  <div className="mt-0.5 ml-4 flex flex-col gap-0.5">
                    {item.children!.map((child) => {
                      const CIcon = child.icon;
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-colors",
                            childActive
                              ? "bg-sidebar-primary/20 text-white"
                              : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-white"
                          )}
                        >
                          <CIcon size={13} />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isTeam  = item.href === "/dashboard/team";
          const isCalls = item.href === "/dashboard/calls";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-sidebar-primary text-white"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
              )}
            >
              <Icon size={15} />
              <span className="flex-1">{item.label}</span>
              {isTeam && onlineCount > 0 && (
                <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {onlineCount}
                </span>
              )}
              {isCalls && missedCount > 0 && (
                <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {missedCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Platform Admin — only visible for platform admins */}
      {isPlatformAdmin && (
        <div className="px-3 pb-1">
          <Link
            href="/dashboard/platform"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors border",
              pathname === "/dashboard/platform"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                : "text-amber-400/60 hover:bg-amber-500/10 hover:text-amber-300 border-transparent"
            )}
          >
            <Shield size={14} />
            <span className="font-medium">Platform Admin</span>
          </Link>
        </div>
      )}

      {/* User Footer */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2.5 px-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-sidebar-primary/30 flex items-center justify-center text-xs text-white font-semibold flex-shrink-0">
            {userName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{userName}</p>
            <p className="text-[10px] text-sidebar-foreground/50 capitalize">{role}</p>
          </div>
        </div>
        <Link
          href="/dashboard/profile"
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-white transition-colors"
        >
          <CircleUser size={12} />
          <span>Profile & Settings</span>
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-white transition-colors"
        >
          <LogOut size={12} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
    </>
  );
}
