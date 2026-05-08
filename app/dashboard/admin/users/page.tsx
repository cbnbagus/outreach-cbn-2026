"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2, X, Check, Shield, UserCheck, User, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsers } from "@/hooks/use-firestore-config";
import { useAuthStore } from "@/store/auth-store";
import type { UserRole } from "@/types";
import { cn } from "@/lib/utils";

const roleConfig: Record<UserRole, { label: string; color: string; icon: React.ElementType }> = {
  admin: { label: "Admin", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Shield },
  supervisor: { label: "Supervisor", color: "bg-amber-100 text-amber-700 border-amber-200", icon: UserCheck },
  agent: { label: "Agent", color: "bg-blue-100 text-blue-700 border-blue-200", icon: User },
};

export default function UsersPage() {
  const { items: firestoreUsers, loading } = useUsers();
  const currentUser = useAuthStore((s) => s.currentUser);

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("agent");
  const [editActive, setEditActive] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // New user form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>("agent");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Map Firestore data to consistent shape
  const users = firestoreUsers.map((u: any) => ({
    uid: u.uid || u.id,
    displayName: u.displayName ?? "—",
    email: u.email ?? "—",
    role: (u.role ?? "agent") as UserRole,
    isActive: u.isActive ?? true,
    createdAt: u.createdAt ?? "",
    avatarInitials: u.avatarInitials ?? u.displayName?.charAt(0) ?? "?",
  }));

  const startEdit = (user: any) => {
    setEditingId(user.uid);
    setEditRole(user.role);
    setEditActive(user.isActive);
  };

  const saveEdit = async (uid: string) => {
    try {
      const [{ doc, updateDoc, serverTimestamp }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("@/lib/firebase"),
      ]);
      await updateDoc(doc(db, "users", uid), {
        role: editRole,
        isActive: editActive,
        updatedAt: serverTimestamp(),
      });
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update user:", err);
    }
  };

  const deleteUser = async (uid: string) => {
    // Soft delete — set isActive to false instead of actually deleting
    try {
      const [{ doc, updateDoc, serverTimestamp }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("@/lib/firebase"),
      ]);
      await updateDoc(doc(db, "users", uid), {
        isActive: false,
        updatedAt: serverTimestamp(),
      });
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to deactivate user:", err);
    }
  };

  const addUser = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return;
    setSaving(true);
    setSaveError("");

    try {
      // Create user in Firebase Auth + Firestore via direct Auth API
      const [{ createUserWithEmailAndPassword }, { doc, setDoc, serverTimestamp }, { auth, db }] = await Promise.all([
        import("firebase/auth"),
        import("firebase/firestore"),
        import("@/lib/firebase"),
      ]);

      // Note: createUserWithEmailAndPassword on client will sign in as the new user.
      // We need to save the current admin session first and restore it after.
      const adminUser = auth.currentUser;

      // Create the new user
      const credential = await createUserWithEmailAndPassword(auth, newEmail.trim(), newPassword);
      const newUid = credential.user.uid;

      // Create Firestore profile
      await setDoc(doc(db, "users", newUid), {
        uid: newUid,
        displayName: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
        isActive: true,
        avatarInitials: newName.trim().split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser?.uid ?? "admin",
      });

      // Sign back in as admin
      // The new user is now signed in, so we need to sign back as admin.
      // Unfortunately client SDK doesn't support creating users without signing in.
      // For now, the page will reload and admin needs to re-login.
      // In production, use Cloud Function createUser instead.

      // Reset form
      setNewName(""); setNewEmail(""); setNewPassword(""); setNewRole("agent"); setShowAdd(false);
      setSaving(false);

      // Notify admin they need to re-login since Auth context switched
      alert("User created successfully! You will need to re-login because Firebase Auth switched to the new user. This will be fixed with Cloud Functions in production.");
      
      // Sign out (new user) and redirect to login
      await auth.signOut();
      window.location.href = "/login";
    } catch (err: any) {
      console.error("Failed to create user:", err);
      const code = err?.code ?? "";
      if (code === "auth/email-already-in-use") setSaveError("Email already in use.");
      else if (code === "auth/weak-password") setSaveError("Password must be at least 6 characters.");
      else if (code === "auth/invalid-email") setSaveError("Invalid email address.");
      else setSaveError(err.message ?? "Failed to create user.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">User Management</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage system users and their roles. {users.filter((u: any) => u.isActive).length} active users.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={14} className="mr-1.5" />Add User
        </Button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <Card className="border border-primary/30 shadow-none">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-foreground mb-3">New User</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Full Name *</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Display name..." className="h-8 text-sm" autoFocus />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Email *</label>
                <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@cbn.or.id" className="h-8 text-sm" type="email" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Password *</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="h-8 text-sm pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Role</label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {saveError && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {saveError}
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">
                User akan bisa login dengan email & password ini.
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowAdd(false); setSaveError(""); }}>Cancel</Button>
                <Button size="sm" disabled={!newName.trim() || !newEmail.trim() || !newPassword.trim() || saving} onClick={addUser}>
                  {saving ? <><Loader2 size={13} className="mr-1.5 animate-spin" />Creating...</> : <><Check size={13} className="mr-1.5" />Create User</>}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="border border-border shadow-none overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">User</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">Email</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">Role</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">Added</th>
              <th className="px-3 py-2.5 w-32" />
            </tr>
          </thead>
          <tbody>
            {users.map((user: any) => {
              const rc = roleConfig[user.role as UserRole] ?? roleConfig.agent;
              const RoleIcon = rc.icon;
              return (
                <tr key={user.uid} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0",
                        user.isActive ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
                      )}>
                        {user.displayName.charAt(0)}
                      </div>
                      <div>
                        <span className={cn("font-medium text-sm", user.isActive ? "text-foreground" : "text-muted-foreground line-through")}>{user.displayName}</span>
                        {user.uid === currentUser?.uid && (
                          <span className="ml-2 text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">You</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-xs text-muted-foreground">{user.email}</td>
                  <td className="px-3 py-3.5">
                    {editingId === user.uid ? (
                      <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border", rc.color)}>
                        <RoleIcon size={9} />{rc.label}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3.5">
                    {editingId === user.uid ? (
                      <Select value={editActive ? "active" : "inactive"} onValueChange={(v) => setEditActive(v === "active")}>
                        <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                        user.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200"
                      )}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString("id-ID") : "—"}
                  </td>
                  <td className="px-3 py-3.5">
                    {/* Don't allow editing yourself */}
                    {user.uid === currentUser?.uid ? (
                      <span className="text-[10px] text-muted-foreground/40 italic">—</span>
                    ) : editingId === user.uid ? (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => saveEdit(user.uid)}><Check size={12} className="text-emerald-600" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}><X size={12} /></Button>
                      </div>
                    ) : deleteConfirmId === user.uid ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-destructive font-medium mr-1">Deactivate?</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteUser(user.uid)}><Check size={12} className="text-destructive" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteConfirmId(null)}><X size={12} /></Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(user)}><Pencil size={12} className="text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteConfirmId(user.uid)}><Trash2 size={12} className="text-destructive/70" /></Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-xs text-muted-foreground">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
