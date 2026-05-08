"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, LogIn, AlertCircle, MessageSquare, Users, BarChart2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: MessageSquare, label: "Omnichannel Inbox",   desc: "WhatsApp, Instagram, Facebook, YouTube — all in one place"    },
  { icon: Users,         label: "Respondent Profiles", desc: "Full history across every conversation and ticket"            },
  { icon: BarChart2,     label: "Impact Analytics",    desc: "Measure outreach outcomes and team performance in real time"  },
  { icon: CheckCircle,   label: "Outcome Tracking",    desc: "Every ticket closed with a recorded result"                   },
];

export default function LoginPage() {
  const router  = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [step,     setStep]     = useState<"login" | "welcome">("login");
  const [welName,  setWelName]  = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const [{ signInWithEmailAndPassword }, { doc, getDoc }, { auth, db }] = await Promise.all([
        import("firebase/auth"),
        import("firebase/firestore"),
        import("@/lib/firebase"),
      ]);
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const snap       = await getDoc(doc(db, "users", credential.user.uid));

      if (!snap.exists()) {
        await auth.signOut();
        setError("Account not found. Contact your administrator.");
        setLoading(false);
        return;
      }

      const data = snap.data();
      if (!data.isActive) {
        await auth.signOut();
        setError("Your account is disabled. Contact your administrator.");
        setLoading(false);
        return;
      }

      // AuthProvider will hydrate the store via onAuthStateChanged,
      // but we also set it here for immediate welcome screen display.
      setUser({
        uid: credential.user.uid,
        displayName: data.displayName ?? "User",
        email: credential.user.email ?? "",
        role: data.role,
        isActive: data.isActive,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      });

      setWelName(data.displayName ?? "User");
      setStep("welcome");
      setTimeout(() => router.push("/dashboard"), 1800);
    } catch (err: any) {
      const code = err?.code ?? "";
      if (["auth/user-not-found","auth/wrong-password","auth/invalid-credential"].includes(code))
        setError("Invalid email or password.");
      else if (code === "auth/too-many-requests")
        setError("Too many attempts. Please wait before trying again.");
      else if (code === "auth/network-request-failed")
        setError("Network error. Check your internet connection.");
      else
        setError("Sign in failed. Please try again.");
      setLoading(false);
    }
  };

  // Welcome screen after login
  if (step === "welcome") {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-sidebar-primary flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome back, {welName.split(" ")[0]}.</h2>
          <p className="text-sm text-sidebar-foreground/50">Redirecting to your dashboard...</p>
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {[0,1,2].map((i) => (
              <div key={i} className={cn("h-1 rounded-full bg-sidebar-primary animate-pulse", i === 0 ? "w-6" : "w-2")}
                style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sidebar flex">

      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex flex-col w-[460px] shrink-0 p-10 border-r border-sidebar-border relative overflow-hidden">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-auto">
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center">
            <MessageSquare size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">ReachTheSoul</p>
            <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest leading-tight">reachthesoul.org</p>
          </div>
        </div>

        {/* Hero copy */}
        <div className="my-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sidebar-primary/20 border border-sidebar-primary/30 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
            <span className="text-xs text-sidebar-primary font-medium">Ministry CRM Platform</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight text-balance mb-4">
            Every conversation.<br />Every soul.<br />All in one place.
          </h1>
          <p className="text-sm text-sidebar-foreground/50 leading-relaxed max-w-xs">
            Built for outreach teams who need to track respondents, manage conversations, and measure real Kingdom impact.
          </p>
        </div>

        {/* Feature list */}
        <div className="flex flex-col gap-4">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-sidebar-accent/50 flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={14} className="text-sidebar-foreground/60" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white leading-tight">{label}</p>
                <p className="text-[11px] text-sidebar-foreground/40 leading-relaxed mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom tagline */}
        <p className="mt-auto pt-8 text-[10px] text-sidebar-foreground/25 border-t border-sidebar-border">
          ReachTheSoul &copy; {new Date().getFullYear()}
        </p>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-[380px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageSquare size={14} className="text-white" />
            </div>
            <span className="font-bold text-foreground text-xs leading-tight">ReachTheSoul<br /><span className="text-[10px] font-normal text-muted-foreground">reachthesoul.org</span></span>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-foreground text-balance">Sign in to ReachTheSoul</h2>
            <p className="text-sm text-muted-foreground mt-1.5">Enter your credentials to continue.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Email address</label>
              <Input
                type="email" placeholder="you@ministry.org"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required autoComplete="email" className="h-10 text-sm"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground">Password</label>
              </div>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"} placeholder="Enter your password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required autoComplete="current-password" className="h-10 text-sm pr-10"
                />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/8 border border-destructive/20 text-xs text-destructive">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />{error}
              </div>
            )}

            <Button type="submit" className="h-10 w-full font-semibold" disabled={loading}>
              {loading
                ? <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</span>
                : <span className="flex items-center gap-2"><LogIn size={14} />Sign in</span>
              }
            </Button>
          </form>

          {/* Help text */}
          <p className="text-[11px] text-muted-foreground text-center mt-6 leading-relaxed">
            Don&apos;t have an account?{" "}
            <a href="/register" className="text-primary font-medium hover:underline">
              Sign up for free
            </a>
          </p>

        </div>
      </div>
    </div>
  );
}
