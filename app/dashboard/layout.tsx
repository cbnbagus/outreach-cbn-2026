"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { SoftPhone } from "@/components/calls/SoftPhone";
import { useAuthStore } from "@/store/auth-store";
import { usePresenceStore } from "@/store/presence-store";
import AuthProvider from "@/components/auth/AuthProvider";
import type { UserRole } from "@/types";

const pageTitles: Record<string, string> = {
  "/dashboard":                    "Overview",
  "/dashboard/respondents":        "Respondents",
  "/dashboard/tickets":            "Ticket Queue",
  "/dashboard/social-inbox":       "Social Inbox",
  "/dashboard/schedule":           "Schedule",
  "/dashboard/team":               "Team",
  "/dashboard/reports":            "Reports",
  "/dashboard/admin/users":        "User Management",
  "/dashboard/admin/categories":   "Categories",
  "/dashboard/admin/lead-sources": "Lead Sources",
  "/dashboard/admin/outcomes":     "Interaction Outcomes",
  "/dashboard/admin/integrations": "Integrations",
  "/dashboard/admin/ai-settings":   "AI Integration Settings",
  "/dashboard/admin/call-settings": "Call Settings",
  "/dashboard/calls":                 "Call Log",
  "/dashboard/respondents/new":       "New Respondent",
};

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { currentUser, role, isLoading } = useAuthStore();
  const { init: initPresence, cleanup: cleanupPresence } = usePresenceStore();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Init presence simulation once user is confirmed
  useEffect(() => {
    if (!isLoading && currentUser) {
      initPresence(currentUser.uid ?? "agent001");
    }
    return () => cleanupPresence();
  }, [isLoading, currentUser]);

  // Redirect to login once auth state is confirmed empty (not while still loading)
  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace("/login");
    }
  }, [isLoading, currentUser, router]);

  const getTitle = () => {
    if (pathname.startsWith("/dashboard/tickets/") && pathname !== "/dashboard/tickets/new") return "Conversation View";
    if (pathname.startsWith("/dashboard/respondents/") && pathname !== "/dashboard/respondents/new") return "Respondent Profile";
    return pageTitles[pathname] ?? "Dashboard";
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  const handleRoleSwitch = (_newRole: UserRole) => {
    // Role is determined by Firestore in production
  };

  // Show spinner while Firebase resolves auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  // Auth resolved but no user — show blank while redirect fires
  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        role={role!}
        userName={currentUser.displayName}
        onLogout={handleLogout}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title={getTitle()}
          role={role!}
          userName={currentUser.displayName}
          onRoleSwitch={handleRoleSwitch}
          onMenuOpen={() => setMobileSidebarOpen(true)}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
      <SoftPhone />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
