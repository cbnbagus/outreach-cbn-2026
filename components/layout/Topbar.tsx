"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, Ticket, MessageSquare, CheckCircle2, MessageCircle, Settings, Menu, Search, Users } from "lucide-react";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PresenceDot, STATUS_LABEL, STATUS_COLOR } from "@/components/presence/PresenceDot";
import { usePresenceStore } from "@/store/presence-store";
import { useAuthStore } from "@/store/auth-store";
import { useUsers } from "@/hooks/use-firestore-config";
import type { UserRole, AppNotification, OnlineStatus } from "@/types";
import { cn } from "@/lib/utils";

const roleColors: Record<UserRole, string> = {
  agent:      "bg-blue-100   text-blue-700   border-blue-200",
  supervisor: "bg-amber-100  text-amber-700  border-amber-200",
  admin:      "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const notifIcons: Record<string, React.ElementType> = {
  new_ticket:       Ticket,
  ticket_assigned:  Ticket,
  new_message:      MessageSquare,
  ticket_resolved:  CheckCircle2,
  new_comment:      MessageCircle,
  system:           Settings,
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface TopbarProps {
  title:        string;
  role:         UserRole;
  userName:     string;
  onRoleSwitch: (role: UserRole) => void;
  onMenuOpen:   () => void;
}

export function Topbar({ title, role, userName, onRoleSwitch, onMenuOpen }: TopbarProps) {
  const [notifs, setNotifs]         = useState<AppNotification[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const unread = notifs.filter((n) => !n.isRead).length;

  const { getOnlineCount, getAllPresence, setStatus, getPresence, initialized, init } = usePresenceStore();
  const currentUser = useAuthStore((s) => s.currentUser);
  const { items: allUsers } = useUsers();

  const currentUid = currentUser?.uid ?? "";

  useEffect(() => { if (currentUid) init(currentUid); }, [currentUid]);

  const myPresence    = getPresence(currentUid);
  const myStatus      = myPresence?.status ?? "online";
  const onlineCount   = initialized ? getOnlineCount() : 0;
  const allPresence   = initialized ? getAllPresence() : [];
  const onlineAgents  = allPresence
    .filter((p) => (p.status === "online" || p.status === "busy") && p.uid !== currentUid)
    .map((p) => allUsers.find((u: any) => (u.uid || u.id) === p.uid))
    .filter(Boolean)
    .slice(0, 5);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
  const markRead = (id: string) => setNotifs((prev) => prev.map((n) => n.notifId === id ? { ...n, isRead: true } : n));

  return (
    <>
    <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-1.5 rounded-md hover:bg-muted transition-colors"
          onClick={onMenuOpen}
          aria-label="Open menu"
        >
          <Menu size={18} className="text-muted-foreground" />
        </button>
        <h1 className="text-sm font-semibold text-foreground">{title}</h1>
      </div>

      {/* Search trigger */}
      <button
        onClick={() => setSearchOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-muted/40 hover:bg-muted transition-colors text-xs text-muted-foreground min-w-[160px]"
      >
        <Search size={12} />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="flex items-center gap-0.5 text-[9px] bg-background border border-border rounded px-1">
          ⌘K
        </kbd>
      </button>
      <button
        onClick={() => setSearchOpen(true)}
        className="sm:hidden p-1.5 rounded-md hover:bg-muted transition-colors"
        aria-label="Search"
      >
        <Search size={15} className="text-muted-foreground" />
      </button>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Demo role switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors hover:opacity-80",
              roleColors[role]
            )}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {role}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
              Preview as role
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(["agent", "supervisor", "admin"] as UserRole[]).map((r) => (
              <DropdownMenuItem
                key={r}
                onClick={() => onRoleSwitch(r)}
                className={cn("text-xs capitalize cursor-pointer", role === r && "font-semibold")}
              >
                <span className={cn("w-2 h-2 rounded-full mr-2", {
                  "bg-blue-500":    r === "agent",
                  "bg-amber-500":   r === "supervisor",
                  "bg-emerald-500": r === "admin",
                })} />
                {r}
                {role === r && <span className="ml-auto text-[9px] text-muted-foreground">current</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notification bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative p-1.5 rounded-md hover:bg-muted transition-colors">
              <Bell size={15} className="text-muted-foreground" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[11px] text-primary hover:underline">
                  Mark all as read
                </button>
              )}
            </div>
            <div className="max-h-[340px] overflow-y-auto">
              {notifs.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">No notifications</p>
              )}
              {notifs.map((n) => {
                const Icon = notifIcons[n.type] ?? Bell;
                return (
                  <Link
                    key={n.notifId}
                    href={n.href}
                    onClick={() => markRead(n.notifId)}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0",
                      !n.isRead && "bg-primary/5"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      n.isRead ? "bg-muted" : "bg-primary/10"
                    )}>
                      <Icon size={13} className={n.isRead ? "text-muted-foreground" : "text-primary"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs leading-snug", n.isRead ? "text-muted-foreground" : "text-foreground font-medium")}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </Link>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Online count chip */}
        <Link
          href="/dashboard/team"
          className="hidden sm:flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors"
        >
          <Users size={10} />
          {onlineCount} online
        </Link>

        {/* Avatar + presence status changer */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative flex-shrink-0">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-semibold hover:bg-primary/20 transition-colors">
                {userName.charAt(0)}
              </div>
              <PresenceDot
                status={myStatus}
                size="sm"
                className="absolute -bottom-0.5 -right-0.5"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs font-semibold">{userName}</DropdownMenuLabel>
            <p className="px-2 pb-1 text-[10px] text-muted-foreground capitalize">{role}</p>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Set my status
            </DropdownMenuLabel>
            {(["online","busy","away","offline"] as OnlineStatus[]).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => setStatus(currentUid, s)}
                className={cn("text-xs cursor-pointer gap-2", myStatus === s && "font-semibold")}
              >
                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_COLOR[s])} />
                {STATUS_LABEL[s]}
                {myStatus === s && <span className="ml-auto text-[9px] text-muted-foreground">current</span>}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {/* Who else is online right now */}
            {onlineAgents.length > 0 && (
              <>
                <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Also online now
                </DropdownMenuLabel>
                {onlineAgents.map((u) => {
                  if (!u) return null;
                  const p = getPresence(u.uid);
                  return (
                    <div key={u.uid} className="flex items-center gap-2 px-2 py-1.5">
                      <div className="relative">
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-semibold text-muted-foreground">
                          {u.avatarInitials ?? u.displayName.charAt(0)}
                        </div>
                        <PresenceDot status={p?.status ?? "offline"} size="sm" className="absolute -bottom-0.5 -right-0.5" />
                      </div>
                      <span className="text-xs text-foreground truncate">{u.displayName}</span>
                      {p?.note && <span className="text-[9px] text-muted-foreground truncate ml-auto">{p.note}</span>}
                    </div>
                  );
                })}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile" className="text-xs cursor-pointer">
                View Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/team" className="text-xs cursor-pointer">
                Team Overview
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    </>
  );
}
