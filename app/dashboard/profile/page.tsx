"use client";
import { useState } from "react";
import { User, Lock, Bell, Shield, Check, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

type Tab = "profile" | "security" | "notifications";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile",       label: "Profile",       icon: User   },
  { id: "security",      label: "Security",       icon: Lock   },
  { id: "notifications", label: "Notifications",  icon: Bell   },
];

const roleColors: Record<string, string> = {
  admin:      "bg-emerald-100 text-emerald-700",
  supervisor: "bg-amber-100  text-amber-700",
  agent:      "bg-blue-100   text-blue-700",
};

export default function ProfilePage() {
  const { currentUser } = useAuthStore();
  const [tab, setTab] = useState<Tab>("profile");

  // Profile state
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? "");
  const [email]                        = useState(currentUser?.email ?? "");
  const [phone, setPhone]              = useState("+62 812 3456 7890");
  const [savedProfile, setSavedProfile] = useState(false);

  // Security state
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [pwError, setPwError]       = useState("");
  const [pwSaved, setPwSaved]       = useState(false);

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState({
    newTicket:       true,
    ticketAssigned:  true,
    newMessage:      true,
    ticketResolved:  false,
    newComment:      true,
    systemUpdates:   false,
    emailDigest:     true,
  });
  const [notifSaved, setNotifSaved] = useState(false);

  const handleSaveProfile = () => {
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2000);
  };

  const handleSavePw = () => {
    setPwError("");
    if (!currentPw) { setPwError("Enter your current password."); return; }
    if (newPw.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match."); return; }
    setPwSaved(true);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setTimeout(() => setPwSaved(false), 2000);
  };

  const handleSaveNotifs = () => {
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2000);
  };

  const togglePref = (key: keyof typeof notifPrefs) =>
    setNotifPrefs((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h2 className="text-base font-semibold text-foreground">Profile & Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Manage your account, security, and notification preferences.</p>
      </div>

      {/* Avatar + name card */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl text-primary font-bold flex-shrink-0">
              {(currentUser?.displayName ?? "U").charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{currentUser?.displayName}</p>
              <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
              <span className={cn("inline-flex items-center mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", roleColors[currentUser?.role ?? "agent"])}>
                <Shield size={9} className="mr-1" />
                {currentUser?.role}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Profile */}
      {tab === "profile" && (
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Display Name</label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email Address</label>
                <Input value={email} disabled className="h-9 text-sm bg-muted/50" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 text-sm" placeholder="+62..." />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <Input value={currentUser?.role ?? ""} disabled className="h-9 text-sm bg-muted/50 capitalize" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              {savedProfile && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <Check size={12} /> Saved
                </span>
              )}
              <Button size="sm" onClick={handleSaveProfile}>Save Changes</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: Security */}
      {tab === "security" && (
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold">Change Password</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Current Password</label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="h-9 text-sm pr-9"
                  placeholder="Enter current password"
                />
                <button onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">New Password</label>
              <Input
                type={showPw ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="h-9 text-sm"
                placeholder="Minimum 6 characters"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Confirm New Password</label>
              <Input
                type={showPw ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="h-9 text-sm"
                placeholder="Repeat new password"
              />
            </div>
            {pwError && <p className="text-xs text-destructive font-medium">{pwError}</p>}
            <div className="flex items-center justify-end gap-3 pt-1">
              {pwSaved && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <Check size={12} /> Password updated
                </span>
              )}
              <Button size="sm" onClick={handleSavePw}>Update Password</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: Notifications */}
      {tab === "notifications" && (
        <Card className="border border-border shadow-none">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-semibold">Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 flex flex-col gap-0">
            {([
              { key: "newTicket",      label: "New ticket created",         desc: "When a new ticket is opened in the system" },
              { key: "ticketAssigned", label: "Ticket assigned to me",       desc: "When a ticket is assigned to you" },
              { key: "newMessage",     label: "New message on my tickets",   desc: "When someone replies on a ticket you own" },
              { key: "ticketResolved", label: "Ticket resolved",             desc: "When a ticket you own is marked resolved" },
              { key: "newComment",     label: "New social media comment",    desc: "When a new comment arrives in Social Inbox" },
              { key: "systemUpdates",  label: "System updates",              desc: "Maintenance notices and system announcements" },
              { key: "emailDigest",    label: "Daily email digest",          desc: "Summary of activity sent to your email every morning" },
            ] as { key: keyof typeof notifPrefs; label: string; desc: string }[]).map((item, i, arr) => (
              <div
                key={item.key}
                className={cn("flex items-center justify-between py-3.5", i < arr.length - 1 && "border-b border-border")}
              >
                <div>
                  <p className="text-sm text-foreground font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <button
                  onClick={() => togglePref(item.key)}
                  className={cn(
                    "relative w-9 h-5 rounded-full transition-colors flex-shrink-0",
                    notifPrefs[item.key] ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                    notifPrefs[item.key] ? "translate-x-4" : "translate-x-0.5"
                  )} />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-end gap-3 pt-4">
              {notifSaved && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <Check size={12} /> Preferences saved
                </span>
              )}
              <Button size="sm" onClick={handleSaveNotifs}>Save Preferences</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
