"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Eye, EyeOff, ArrowRight, AlertCircle, MessageSquare, Heart, Shield,
  Users, BarChart2, CheckCircle, Building2, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: MessageSquare, label: "Omnichannel Inbox",   desc: "Receive prayer requests from WhatsApp, Instagram, Facebook — one place" },
  { icon: Users,         label: "24/7 AI Counselor",   desc: "AI listens with empathy first, human counselors join when needed" },
  { icon: BarChart2,     label: "Prayer & Care Tracking", desc: "Track every prayer request, counseling session, and follow-up" },
  { icon: CheckCircle,   label: "Counseling Outcomes",  desc: "Record outcomes — from first prayer to ongoing pastoral care" },
];

export default function RegisterPage() {
  const router = useRouter();

  // Step 1: Account
  const [fullName,  setFullName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPass,  setShowPass]  = useState(false);

  // Step 2: Organization
  const [orgName,   setOrgName]   = useState("");
  const [timezone,  setTimezone]  = useState("Asia/Jakarta");

  // State
  const [step,     setStep]     = useState<1 | 2>(1);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) { setError("Please enter your name."); return; }
    if (!email.trim())    { setError("Please enter your email."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setStep(2);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!orgName.trim()) { setError("Please enter your organization name."); return; }
    setLoading(true);

    try {
      const [
        { createUserWithEmailAndPassword },
        { doc, setDoc, collection, addDoc, serverTimestamp },
        { auth, db },
      ] = await Promise.all([
        import("firebase/auth"),
        import("firebase/firestore"),
        import("@/lib/firebase"),
      ]);

      // 1. Create Firebase Auth user
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = credential.user.uid;

      // 2. Generate org slug
      const slug = orgName.trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40)
        + "-" + uid.slice(0, 6);

      // 3. Create Organization
      await setDoc(doc(db, "organizations", slug), {
        orgId: slug,
        name: orgName.trim(),
        slug,
        plan: "free",
        logoUrl: "",
        primaryColor: "#2B6CB0",
        limits: {
          maxUsers: 1,
          maxRespondents: 50,
          maxAIConversations: 50,
          maxWhatsAppConversations: 0,
          channels: ["website"],
        },
        usage: {
          currentUsers: 1,
          currentRespondents: 0,
          aiConversationsThisMonth: 0,
          waConversationsThisMonth: 0,
          usageResetDate: new Date().toISOString(),
        },
        channelConfig: {},
        aiConfig: {
          enabled: false,
          autoReply: false,
          provider: "openai",
          apiKey: "",
          model: "gpt-4o-mini",
          systemPrompt: "You are a compassionate prayer and counseling companion. Listen with empathy, offer comfort through scripture and prayer, and know when to connect the person with a human counselor.",
          escalationTriggers: [
            { reason: "prayer_request", label: "Prayer Request", keywords: ["pray", "prayer", "doa", "doakan", "berdoa"], enabled: true },
            { reason: "crisis", label: "Crisis / Urgent", keywords: ["bunuh diri", "suicide", "putus asa", "mau mati"], enabled: true },
          ],
          channelToggles: {},
        },
        progressSteps: ["Data", "Prayer", "Counseling", "Recommitment", "Salvation", "Community"],
        programSources: ["Website", "WhatsApp", "Instagram", "Facebook", "YouTube", "Referral", "Event"],
        billingEmail: email.trim(),
        timezone,
        language: "id",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: uid,
        isActive: true,
      });

      // 4. Create User profile
      const initials = fullName.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      await setDoc(doc(db, "users", uid), {
        uid,
        displayName: fullName.trim(),
        email: email.trim(),
        role: "admin",
        isActive: true,
        avatarInitials: initials,
        primaryOrgId: slug,
        orgMemberships: [{
          orgId: slug,
          orgName: orgName.trim(),
          role: "admin",
          joinedAt: new Date().toISOString(),
        }],
        orgRoles: { [slug]: "admin" },
        isPlatformAdmin: false,
        createdAt: serverTimestamp(),
      });

      // 5. Create ticket counter
      await setDoc(doc(db, "counters", `${slug}_tickets`), {
        count: 0,
        orgId: slug,
      });

      // 6. Create default categories
      const defaults = {
        categories: ["General Inquiry", "Prayer Request", "Counseling", "Follow-up", "Testimony"],
        lead_sources: ["WhatsApp", "Instagram", "Facebook", "YouTube", "Website", "Referral", "Event"],
        interaction_outcomes: ["Accepted Christ", "Rededication", "Referred to Pastor", "Joined Small Group", "Follow-up Scheduled", "No Response"],
      };

      for (const [colName, items] of Object.entries(defaults)) {
        for (const name of items) {
          await addDoc(collection(db, colName), {
            orgId: slug,
            name,
            description: "",
            isActive: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: uid,
          });
        }
      }

      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2000);

    } catch (err: any) {
      console.error("Registration failed:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please sign in instead.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Use at least 6 characters.");
      } else {
        setError(err.message ?? "Something went wrong. Please try again.");
      }
      setLoading(false);
    }
  };

  // ─── Success screen ────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to ReachTheSoul!</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Your organization <strong>{orgName}</strong> is ready. Redirecting to dashboard...
          </p>
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // ─── Main form ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-sidebar flex flex-col lg:flex-row">

      {/* Left branding panel — DESKTOP: full sidebar, MOBILE: compact header */}
      <div className="flex flex-col lg:w-[460px] shrink-0 p-6 lg:p-10 lg:border-r border-sidebar-border relative overflow-hidden">
        <div className="flex items-center gap-3 lg:mb-auto">
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center">
            <Heart size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">ReachTheSoul</p>
            <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest leading-tight">reachthesoul.org</p>
          </div>
        </div>

        <div className="my-6 lg:my-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sidebar-primary/20 border border-sidebar-primary/30 mb-4 lg:mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
            <span className="text-xs text-sidebar-primary font-medium">Prayer & Counseling Platform</span>
          </div>
          <h1 className="text-2xl lg:text-4xl font-bold text-white leading-tight text-balance mb-3 lg:mb-4">
            Every prayer heard.<br className="hidden lg:block" />
            Every soul cared for.
          </h1>
          <p className="text-xs lg:text-sm text-sidebar-foreground/50 leading-relaxed max-w-xs">
            Free to start. No credit card required. Set up your prayer & counseling platform in under 2 minutes.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-4">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-2 lg:gap-3">
              <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-sidebar-accent/50 flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={13} className="text-sidebar-foreground/60" />
              </div>
              <div>
                <p className="text-[11px] lg:text-xs font-semibold text-white leading-tight">{label}</p>
                <p className="text-[10px] lg:text-[11px] text-sidebar-foreground/40 leading-relaxed mt-0.5 hidden lg:block">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="hidden lg:block mt-auto pt-8 text-[10px] text-sidebar-foreground/25 border-t border-sidebar-border">
          ReachTheSoul &copy; {new Date().getFullYear()} &middot; Where every soul finds care
        </p>
      </div>

      {/* Right — registration form */}
      <div className="flex-1 flex items-start lg:items-center justify-center p-6 bg-background rounded-t-2xl lg:rounded-none -mt-2 lg:mt-0">
        <div className="w-full max-w-[420px]">

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-7">
            <div className={cn(
              "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold",
              step >= 1 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            )}>1</div>
            <div className={cn("h-0.5 flex-1", step >= 2 ? "bg-primary" : "bg-muted")} />
            <div className={cn(
              "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold",
              step >= 2 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            )}>2</div>
          </div>

          {step === 1 ? (
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-foreground">Create your account</h2>
                <p className="text-sm text-muted-foreground mt-1.5">Step 1 of 2 — Your personal details</p>
              </div>

              <form onSubmit={handleStep1} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Full name</label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Email address</label>
                  <Input
                    type="email"
                    placeholder="john@church.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
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
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPass(!showPass)}
                      tabIndex={-1}
                    >
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

                <Button type="submit" className="w-full gap-2 mt-1">
                  Continue <ArrowRight size={16} />
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-foreground">Set up your organization</h2>
                <p className="text-sm text-muted-foreground mt-1.5">Step 2 of 2 — Where will you be reaching souls?</p>
              </div>

              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Organization name</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="e.g. Grace Community Church"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="pl-10"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">This can be your church, ministry, or organization name.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="Asia/Jakarta">Asia/Jakarta (WIB, GMT+7)</option>
                    <option value="Asia/Makassar">Asia/Makassar (WITA, GMT+8)</option>
                    <option value="Asia/Jayapura">Asia/Jayapura (WIT, GMT+9)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT, GMT+8)</option>
                    <option value="Asia/Manila">Asia/Manila (PHT, GMT+8)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST, GMT+5:30)</option>
                    <option value="Asia/Seoul">Asia/Seoul (KST, GMT+9)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST, GMT+9)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEST, GMT+10)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Europe/Berlin">Europe/Berlin (CET, GMT+1)</option>
                    <option value="America/New_York">America/New York (EST, GMT-5)</option>
                    <option value="America/Chicago">America/Chicago (CST, GMT-6)</option>
                    <option value="America/Los_Angeles">America/Los Angeles (PST, GMT-8)</option>
                    <option value="America/Sao_Paulo">America/São Paulo (BRT, GMT-3)</option>
                    <option value="Africa/Lagos">Africa/Lagos (WAT, GMT+1)</option>
                    <option value="Africa/Nairobi">Africa/Nairobi (EAT, GMT+3)</option>
                  </select>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2.5">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-3 mt-1">
                  <Button type="button" variant="outline" onClick={() => { setStep(1); setError(""); }} className="flex-1">
                    Back
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 gap-2">
                    {loading ? (
                      <><Loader2 size={16} className="animate-spin" /> Creating...</>
                    ) : (
                      <><CheckCircle size={16} /> Create Organization</>
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}

          <p className="text-center text-xs text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
