"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Eye, EyeOff, CheckCircle, AlertCircle, MessageSquare,
  Loader2, Users,
} from "lucide-react";

function InviteForm() {
  const router = useRouter();
  const params = useSearchParams();

  const orgId   = params.get("org")   ?? "";
  const orgName = params.get("name")  ?? "an organization";
  const role    = params.get("role")  ?? "agent";

  const [fullName,  setFullName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);

  if (!orgId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Invalid Invite Link</h1>
          <p className="text-sm text-muted-foreground mb-4">
            This invite link is missing required parameters. Please ask your administrator for a new link.
          </p>
          <Link href="/login">
            <Button variant="outline">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) { setError("Please enter your name."); return; }
    if (!email.trim())    { setError("Please enter your email."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      const [
        { createUserWithEmailAndPassword },
        { doc, setDoc, getDoc, updateDoc, serverTimestamp, arrayUnion, increment },
        { auth, db },
      ] = await Promise.all([
        import("firebase/auth"),
        import("firebase/firestore"),
        import("@/lib/firebase"),
      ]);

      // Verify org exists
      const orgSnap = await getDoc(doc(db, "organizations", orgId));
      if (!orgSnap.exists()) {
        setError("Organization not found. The invite link may be invalid.");
        setLoading(false);
        return;
      }

      const orgData = orgSnap.data();

      // Create auth user
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = credential.user.uid;

      // Create user profile with org membership
      const initials = fullName.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      await setDoc(doc(db, "users", uid), {
        uid,
        displayName: fullName.trim(),
        email: email.trim(),
        role,
        isActive: true,
        avatarInitials: initials,
        primaryOrgId: orgId,
        orgMemberships: [{
          orgId,
          orgName: orgData.name ?? orgName,
          role,
          joinedAt: new Date().toISOString(),
        }],
        orgRoles: { [orgId]: role },
        isPlatformAdmin: false,
        createdAt: serverTimestamp(),
      });

      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please sign in and ask your admin to add you.");
      } else {
        setError(err.message ?? "Something went wrong.");
      }
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">You&apos;re in!</h1>
          <p className="text-sm text-muted-foreground mb-4">
            You&apos;ve joined <strong>{orgName}</strong>. Redirecting...
          </p>
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MessageSquare size={14} className="text-white" />
          </div>
          <span className="font-bold text-foreground text-xs leading-tight">
            CBN Outreach<br />
            <span className="text-[10px] font-normal text-muted-foreground">outreachcbn.com</span>
          </span>
        </div>

        {/* Invite banner */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-7 flex items-start gap-3">
          <Users size={20} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              You&apos;ve been invited to join
            </p>
            <p className="text-lg font-bold text-primary mt-0.5">{decodeURIComponent(orgName)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Role: <span className="font-medium capitalize">{role}</span>
            </p>
          </div>
        </div>

        <div className="mb-5">
          <h2 className="text-xl font-bold text-foreground">Create your account to join</h2>
        </div>

        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Full name</label>
            <Input type="text" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Email address</label>
            <Input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Password</label>
            <div className="relative">
              <Input
                type={showPass ? "text" : "password"}
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full gap-2 mt-1">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Joining...</> : <><CheckCircle size={16} /> Join Organization</>}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Already have an account? <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <InviteForm />
    </Suspense>
  );
}
