"use client";

// ────────────────────────────────────────────────────────────────────────────
// "Connect Facebook & Instagram" button + upgrade gate.
//
// Free plan  → opens an upgrade popup (no redirect).
// Paid plan  → redirects the browser to the fbConnectStart Cloud Function, which
//              validates the plan again server-side and bounces to Facebook Login.
//              After authorize, the callback saves accounts and returns the admin
//              here with ?fb_connect=success (handled by <MetaConnectResult/>).
//
// The whole OAuth exchange happens in Cloud Functions; this component only starts
// the flow and reports the result.
// ────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { Facebook, Instagram, Sparkles, ArrowRight, Mail, X, Loader2 } from "lucide-react";
import { useOrgStore } from "@/store/org-store";
import type { PlanTier } from "@/types";

const PAID_PLANS: PlanTier[] = ["starter", "growth", "enterprise"];

function functionsBaseUrl(): string {
  const region = "asia-southeast1";
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "outreach-cbn-2026";
  return `https://${region}-${projectId}.cloudfunctions.net`;
}

export function ConnectMetaButton() {
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const orgId = activeOrg?.orgId;
  const plan = (activeOrg?.plan ?? "free") as PlanTier;
  const isPaid = PAID_PLANS.includes(plan);

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const handleClick = () => {
    if (!orgId) return;
    if (!isPaid) {
      setShowUpgrade(true);
      return;
    }
    // Full-page navigation to the OAuth start endpoint (leaves the SPA).
    setRedirecting(true);
    window.location.href = `${functionsBaseUrl()}/fbConnectStart?org=${encodeURIComponent(orgId)}`;
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={redirecting || !orgId}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium bg-[#1877F2] text-white hover:bg-[#166fe0] transition-colors disabled:opacity-60"
      >
        {redirecting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <span className="flex items-center -space-x-1">
            <Facebook size={14} />
            <Instagram size={14} />
          </span>
        )}
        {redirecting ? "Mengalihkan…" : "Connect Facebook & Instagram"}
      </button>

      {showUpgrade && (
        <UpgradePopup plan={plan} onClose={() => setShowUpgrade(false)} />
      )}
    </>
  );
}

// ── Upgrade popup (free plan) ────────────────────────────────────────────────
function UpgradePopup({ plan, onClose }: { plan: PlanTier; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded hover:bg-muted text-muted-foreground"
        >
          <X size={16} />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1877F2] to-[#E1306C] flex items-center justify-center mx-auto mb-4 text-white">
          <span className="flex items-center -space-x-1">
            <Facebook size={18} />
            <Instagram size={18} />
          </span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-1">
          Facebook &amp; Instagram DM
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Menghubungkan Facebook Messenger dan Instagram DM tersedia di paket berbayar.
          Paket kamu saat ini: <strong className="capitalize">{plan}</strong>.
        </p>

        <div className="flex items-center justify-center gap-1.5 mb-5">
          <Sparkles size={14} className="text-amber-500" />
          <span className="text-xs font-medium text-amber-600">
            Upgrade untuk mengaktifkan omnichannel
          </span>
        </div>

        <a
          href="mailto:outreach@cbn.or.id?subject=Upgrade%20Plan%20-%20Facebook%20%26%20Instagram"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Mail size={14} />
          <span>Hubungi Admin untuk Upgrade</span>
          <ArrowRight size={16} />
        </a>
      </div>
    </div>
  );
}

// ── Return-status banner ──────────────────────────────────────────────────────
// Reads ?fb_connect=... from the URL after the OAuth callback bounces back and
// shows a dismissible banner. Mount once near the top of the Social Accounts page.
export function MetaConnectResult({ onSuccess }: { onSuccess?: () => void }) {
  const [state, setState] = useState<null | {
    kind: "success" | "cancelled" | "no_pages" | "upgrade_required" | "error";
    fb?: string;
    ig?: string;
    reason?: string;
  }>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("fb_connect");
    if (!status) return null;
    return {
      kind: status as any,
      fb: params.get("fb") ?? undefined,
      ig: params.get("ig") ?? undefined,
      reason: params.get("reason") ?? undefined,
    };
  });

  // Clean the query string + refresh account list on success (once, on mount).
  useEffect(() => {
    if (typeof window === "undefined" || !state) return;
    if (state.kind === "success" && onSuccess) onSuccess();
    const url = new URL(window.location.href);
    ["fb_connect", "fb", "ig", "reason", "plan"].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, "", url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state) return null;

  const dismiss = () => setState(null);

  const configs: Record<string, { cls: string; text: string }> = {
    success: {
      cls: "bg-emerald-50 border-emerald-200 text-emerald-800",
      text: `Berhasil terhubung — ${state.fb ?? 0} Page Facebook${
        Number(state.ig ?? 0) > 0 ? ` & ${state.ig} akun Instagram` : ""
      } sekarang aktif.`,
    },
    cancelled: {
      cls: "bg-gray-50 border-gray-200 text-gray-700",
      text: "Koneksi dibatalkan. Kamu belum menghubungkan akun apa pun.",
    },
    no_pages: {
      cls: "bg-amber-50 border-amber-200 text-amber-800",
      text: "Tidak ada Facebook Page yang diberi akses. Coba lagi dan pilih minimal satu Page.",
    },
    upgrade_required: {
      cls: "bg-amber-50 border-amber-200 text-amber-800",
      text: "Paket kamu belum mendukung Facebook & Instagram. Silakan upgrade.",
    },
    error: {
      cls: "bg-red-50 border-red-200 text-red-800",
      text: `Gagal menghubungkan akun${state.reason ? `: ${state.reason}` : "."}`,
    },
  };

  const cfg = configs[state.kind] ?? configs.error;

  return (
    <div className={`flex items-start justify-between gap-3 px-4 py-3 rounded-lg border text-xs ${cfg.cls}`}>
      <span className="leading-relaxed">{cfg.text}</span>
      <button onClick={dismiss} className="shrink-0 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}