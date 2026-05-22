"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, LogIn, AlertCircle, MessageSquare, Users, BarChart2, CheckCircle, Shield, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

const FEATURES = [
  { icon: Globe,          label: "Reach Every Soul",         desc: "Connect with respondents across WhatsApp, Instagram, Facebook — one unified inbox" },
  { icon: MessageSquare,  label: "AI-Powered Conversations", desc: "24/7 AI first response with empathy, seamless handoff to human counselors" },
  { icon: BarChart2,      label: "Track & Disciple",         desc: "Follow every respondent's journey from first contact to spiritual growth" },
  { icon: Shield,         label: "Secure & Multi-Office",    desc: "Each CBN office gets isolated data with role-based access control" },
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

  if (step === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(212,55%,10%)] via-[hsl(210,50%,15%)] to-[hsl(199,60%,20%)] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(199,78%,55%)] flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome back, {welName.split(" ")[0]}.</h2>
          <p className="text-sm text-white/50">Preparing your dashboard...</p>
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {[0,1,2].map((i) => (
              <div key={i} className={cn("h-1 rounded-full bg-[hsl(199,78%,55%)] animate-pulse", i === 0 ? "w-6" : "w-2")}
                style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* Left branding panel — blue gradient */}
      <div className="flex flex-col lg:w-[480px] shrink-0 p-6 lg:p-10 lg:border-r border-white/5 relative overflow-hidden bg-gradient-to-br from-[hsl(212,55%,10%)] via-[hsl(210,50%,15%)] to-[hsl(199,60%,22%)]">

        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }} />

        {/* Logo */}
        <div className="flex items-center gap-3 lg:mb-auto relative z-10">
          <Image
            src="/cbn-logo.png"
            alt="CBN"
            width={120}
            height={48}
            className="h-10 w-auto brightness-0 invert opacity-90"
            priority
          />
        </div>

        {/* Hero copy — mobile: compact, desktop: full */}
        <div className="my-6 lg:my-12 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(199,78%,55%)]/15 border border-[hsl(199,78%,55%)]/25 mb-4 lg:mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[hsl(199,78%,55%)]" />
            <span className="text-xs text-[hsl(199,78%,70%)] font-medium">Outreach Management System</span>
          </div>
          <h1 className="text-2xl lg:text-4xl font-bold text-white leading-tight text-balance mb-3 lg:mb-4">
            Reach Every Soul.<br className="hidden lg:block" />
            Disciple Every Nation.
          </h1>
          <p className="text-xs lg:text-sm text-white/45 leading-relaxed max-w-xs">
            One platform to manage outreach conversations, prayer & counseling, and follow-up — across every digital channel. No soul left behind.
          </p>
        </div>

        {/* Feature list */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-4 relative z-10">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-2 lg:gap-3">
              <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={13} className="text-white/50" />
              </div>
              <div>
                <p className="text-[11px] lg:text-xs font-semibold text-white leading-tight">{label}</p>
                <p className="text-[10px] lg:text-[11px] text-white/35 leading-relaxed mt-0.5 hidden lg:block">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom tagline — desktop only */}
        <p className="hidden lg:block mt-auto pt-8 text-[10px] text-white/20 border-t border-white/8 relative z-10">
          CBN Outreach &copy; {new Date().getFullYear()} &middot; Cahaya Bagi Negeri &middot; Menjangkau &amp; Memuridkan
        </p>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-start lg:items-center justify-center p-6 bg-background rounded-t-2xl lg:rounded-none -mt-2 lg:mt-0">
        <div className="w-full max-w-[380px]">

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-xl lg:text-2xl font-bold text-foreground text-balance">Sign in to CBN Outreach</h2>
            <p className="text-sm text-muted-foreground mt-1.5">Enter your credentials to continue.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Email address</label>
              <Input
                type="email" placeholder="you@cbn.or.id"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required autoComplete="email" className="h-10 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Password</label>
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

          <p className="text-[11px] text-muted-foreground text-center mt-6 leading-relaxed">
            Don&apos;t have an account?{" "}
            <a href="/register" className="text-primary font-medium hover:underline">
              Sign up
            </a>
          </p>

        </div>
      </div>
    </div>
  );
}
