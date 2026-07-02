"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Plus, Pencil, Trash2, CheckCircle2, XCircle, Loader2,
  MessageCircle, Instagram, Facebook, Phone, Mail, Wifi, WifiOff,
  Copy, Check, ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  fetchSocialAccounts,
  addSocialAccount,
  updateSocialAccount,
  deleteSocialAccount,
} from "@/lib/firestore-services";

// ─── Types ────────────────────────────────────────────────────────────────────
type Platform = "facebook" | "instagram" | "whatsapp_fonnte" | "whatsapp_meta" | "email" | "call";

type SocialAccount = {
  id: string;
  platform: Platform;
  programName: string;
  displayName: string;
  credentials: Record<string, any>;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
};

// ─── Platform config ──────────────────────────────────────────────────────────
const PLATFORMS: {
  value: Platform;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  fields: { key: string; label: string; type?: string; placeholder: string; required?: boolean }[];
}[] = [
  {
    value: "facebook",
    label: "Facebook Messenger",
    icon: <Facebook size={14} />,
    iconBg: "bg-blue-100 text-blue-700",
    fields: [
      { key: "pageId", label: "Page ID", placeholder: "128153513725690", required: true },
      { key: "pageName", label: "Page Name", placeholder: "Jadi Berkat Indonesia" },
      { key: "pageAccessToken", label: "Page Access Token", type: "password", placeholder: "EAAxxxx...", required: true },
    ],
  },
  {
    value: "instagram",
    label: "Instagram DM",
    icon: <Instagram size={14} />,
    iconBg: "bg-pink-100 text-pink-700",
    fields: [
      { key: "igUserId", label: "IG Business Account ID", placeholder: "17841400000000", required: true },
      { key: "igUsername", label: "IG Username", placeholder: "@solusi_id" },
      { key: "pageAccessToken", label: "Page Access Token", type: "password", placeholder: "EAAxxxx...", required: true },
      { key: "linkedFacebookPageId", label: "Linked FB Page ID (optional)", placeholder: "128153513725690" },
    ],
  },
  {
    value: "whatsapp_fonnte",
    label: "WhatsApp (Fonnte)",
    icon: <MessageCircle size={14} />,
    iconBg: "bg-emerald-100 text-emerald-700",
    fields: [
      { key: "token", label: "Fonnte API Token", type: "password", placeholder: "9kRcuqZi...", required: true },
      { key: "deviceNumber", label: "Device Phone Number", placeholder: "628123456789", required: true },
      { key: "deviceLabel", label: "Device Label", placeholder: "CBN Main Device" },
    ],
  },
  {
    value: "whatsapp_meta",
    label: "WhatsApp Cloud API (Meta)",
    icon: <MessageCircle size={14} />,
    iconBg: "bg-emerald-100 text-emerald-700",
    fields: [
      { key: "phoneNumberId", label: "Phone Number ID", placeholder: "1234567890", required: true },
      { key: "wabaId", label: "WABA ID", placeholder: "9876543210", required: true },
      { key: "accessToken", label: "Access Token", type: "password", placeholder: "EAAxxxx...", required: true },
    ],
  },
  {
    value: "email",
    label: "Email",
    icon: <Mail size={14} />,
    iconBg: "bg-gray-100 text-gray-700",
    fields: [
      { key: "address", label: "Email Address", placeholder: "hello@solusi.org", required: true },
    ],
  },
  {
    value: "call",
    label: "Call / VOIP",
    icon: <Phone size={14} />,
    iconBg: "bg-amber-100 text-amber-700",
    fields: [
      { key: "provider", label: "Provider", placeholder: "manual / twilio / voip" },
      { key: "inboundNumber", label: "Inbound Number", placeholder: "+628001234" },
    ],
  },
];

function getPlatformConfig(p: Platform) {
  return PLATFORMS.find((x) => x.value === p) ?? PLATFORMS[0];
}

// ─── Test connection helper ───────────────────────────────────────────────────
async function testConnection(platform: Platform, credentials: Record<string, any>): Promise<{ ok: boolean; message: string }> {
  try {
    if (platform === "facebook") {
      const token = credentials.pageAccessToken ?? "";
      if (!token) return { ok: false, message: "Token kosong" };
      const res = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${token}`);
      const data = await res.json();
      if (data.error) return { ok: false, message: data.error.message };
      return { ok: true, message: `Terhubung ke "${data.name}" (ID: ${data.id})` };
    }

    if (platform === "instagram") {
      const token = credentials.pageAccessToken ?? "";
      if (!token) return { ok: false, message: "Token kosong" };
      // Instagram Login tokens (IGAA...) use graph.instagram.com;
      // legacy Page-linked tokens (EAA...) use graph.facebook.com
      const isIgLoginToken = token.startsWith("IG");
      if (isIgLoginToken) {
        const res = await fetch(`https://graph.instagram.com/v21.0/me?fields=user_id,username&access_token=${token}`);
        const data = await res.json();
        if (data.error) return { ok: false, message: data.error.message };
        return { ok: true, message: `Terhubung ke @${data.username ?? "?"} (ID: ${data.user_id ?? data.id})` };
      } else {
        const res = await fetch(`https://graph.facebook.com/v18.0/me?fields=name,instagram_business_account&access_token=${token}`);
        const data = await res.json();
        if (data.error) return { ok: false, message: data.error.message };
        const igId = data.instagram_business_account?.id;
        return { ok: true, message: `Page: "${data.name}"${igId ? `, IG ID: ${igId}` : " (IG belum terhubung ke Page)"}` };
      }
    }

    if (platform === "whatsapp_meta") {
      const token = credentials.accessToken ?? "";
      const phoneId = credentials.phoneNumberId ?? "";
      if (!token || !phoneId) return { ok: false, message: "Token atau Phone Number ID kosong" };
      const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}?access_token=${token}`);
      const data = await res.json();
      if (data.error) return { ok: false, message: data.error.message };
      return { ok: true, message: `Phone: ${data.display_phone_number ?? phoneId}` };
    }

    if (platform === "whatsapp_fonnte") {
      const token = credentials.token ?? "";
      if (!token) return { ok: false, message: "Token kosong" };
      const res = await fetch("https://api.fonnte.com/device", {
        method: "POST",
        headers: { "Authorization": token },
      });
      const data = await res.json();
      if (data.status === false) return { ok: false, message: data.reason ?? "Token invalid" };
      return { ok: true, message: `Device: ${data.device_status ?? "connected"}` };
    }

    return { ok: true, message: "Platform ini tidak memerlukan test connection" };
  } catch (err: any) {
    return { ok: false, message: err.message ?? "Connection failed" };
  }
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border border-border bg-background hover:bg-muted transition-colors text-muted-foreground"
    >
      {copied ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}
      {copied ? "Disalin" : "Copy"}
    </button>
  );
}

// ─── Account Card ─────────────────────────────────────────────────────────────
function AccountCard({
  account,
  onEdit,
  onDelete,
  onToggle,
}: {
  account: SocialAccount;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const pConfig = getPlatformConfig(account.platform);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testConnection(account.platform, account.credentials);
    setTestResult(result);
    setTesting(false);
  };

  // Build webhook hint
  const webhookHint = (() => {
    if (account.platform === "facebook" || account.platform === "instagram") {
      return `Webhook otomatis routing by Page ID dari payload Meta. Pastikan Page sudah subscribe ke app.`;
    }
    if (account.platform === "whatsapp_fonnte") {
      return `Set webhook di Fonnte ke URL webhookFonnte. Device number ${account.credentials?.deviceNumber ?? "—"} akan auto-match.`;
    }
    return "";
  })();

  return (
    <Card className={cn("border shadow-none transition-opacity", !account.isActive && "opacity-50")}>
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", pConfig.iconBg)}>
              {pConfig.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold truncate">{account.displayName}</span>
                {!account.isActive && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">Nonaktif</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{pConfig.label}</span>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] font-medium text-primary">{account.programName}</span>
              </div>
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Edit">
              <Pencil size={13} />
            </button>
            <button onClick={onToggle} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title={account.isActive ? "Nonaktifkan" : "Aktifkan"}>
              {account.isActive ? <Wifi size={13} /> : <WifiOff size={13} />}
            </button>
            <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600" title="Hapus">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Credential summary */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {account.platform === "facebook" && (
            <span>Page ID: <span className="font-mono">{account.credentials?.pageId ?? "—"}</span></span>
          )}
          {account.platform === "instagram" && (
            <span>IG ID: <span className="font-mono">{account.credentials?.igUserId ?? "—"}</span></span>
          )}
          {account.platform === "whatsapp_fonnte" && (
            <span>Device: <span className="font-mono">{account.credentials?.deviceNumber ?? "—"}</span></span>
          )}
          {account.platform === "whatsapp_meta" && (
            <span>Phone ID: <span className="font-mono">{account.credentials?.phoneNumberId ?? "—"}</span></span>
          )}
          {account.platform === "email" && (
            <span>{account.credentials?.address ?? "—"}</span>
          )}
        </div>

        {/* Webhook hint */}
        {webhookHint && (
          <p className="text-[10px] text-muted-foreground leading-relaxed">{webhookHint}</p>
        )}

        {/* Test connection */}
        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 size={11} className="animate-spin" /> : <Wifi size={11} />}
            {testing ? "Testing..." : "Test Connection"}
          </button>
          {testResult && (
            <div className={cn("flex items-center gap-1 text-[11px]", testResult.ok ? "text-emerald-600" : "text-red-500")}>
              {testResult.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              <span className="truncate max-w-[300px]">{testResult.message}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function AccountModal({
  initial,
  onClose,
  onSave,
  saving,
}: {
  initial?: SocialAccount | null;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
  saving: boolean;
}) {
  const isEdit = !!initial;
  const [platform, setPlatform] = useState<Platform>(initial?.platform ?? "facebook");
  const [programName, setProgramName] = useState(initial?.programName ?? "");
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [creds, setCreds] = useState<Record<string, string>>(() => {
    if (!initial?.credentials) return {};
    const c: Record<string, string> = {};
    for (const [k, v] of Object.entries(initial.credentials)) {
      c[k] = String(v ?? "");
    }
    return c;
  });
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);

  const pConfig = getPlatformConfig(platform);

  const handleSubmit = () => {
    if (!programName.trim() || !displayName.trim()) return;
    onSave({
      platform,
      programName: programName.trim(),
      displayName: displayName.trim(),
      credentials: { ...creds },
    });
  };

  // Auto-generate displayName
  useEffect(() => {
    if (!isEdit && programName) {
      setDisplayName(`${programName} @ ${pConfig.label.split(" ")[0]}`);
    }
  }, [programName, platform]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">{isEdit ? "Edit Social Account" : "Tambah Social Account"}</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isEdit ? "Update kredensial dan pengaturan akun." : "Hubungkan akun sosial media baru ke OMS."}
          </p>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Platform picker */}
          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Platform</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPlatformPicker(!showPlatformPicker)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-border text-xs hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("w-6 h-6 rounded flex items-center justify-center", pConfig.iconBg)}>{pConfig.icon}</span>
                    {pConfig.label}
                  </div>
                  <ChevronDown size={12} className="text-muted-foreground" />
                </button>
                {showPlatformPicker && (
                  <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-background border border-border rounded-md shadow-lg py-1">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => { setPlatform(p.value); setShowPlatformPicker(false); setCreds({}); }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors",
                          platform === p.value && "bg-muted font-medium"
                        )}
                      >
                        <span className={cn("w-5 h-5 rounded flex items-center justify-center", p.iconBg)}>{p.icon}</span>
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Program name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Nama Program *</label>
            <Input
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="Solusi, Superyouth, Jadi Berkat, dll"
              className="h-9 text-xs"
            />
          </div>

          {/* Display name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Display Name *</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Solusi @ Facebook"
              className="h-9 text-xs"
            />
          </div>

          {/* Platform-specific credential fields */}
          <div className="flex flex-col gap-3 pt-2 border-t border-border">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Kredensial {pConfig.label}</span>
            {pConfig.fields.map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <label className="text-[11px] text-muted-foreground">
                  {field.label} {field.required && <span className="text-red-400">*</span>}
                </label>
                <Input
                  type={field.type ?? "text"}
                  value={creds[field.key] ?? ""}
                  onChange={(e) => setCreds((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="h-9 text-xs font-mono"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs font-medium border border-border hover:bg-muted transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !programName.trim() || !displayName.trim()}
            className="px-4 py-1.5 rounded text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : isEdit ? "Update" : "Tambah Akun"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirmation ──────────────────────────────────────────────────────
function DeleteModal({
  account,
  onClose,
  onConfirm,
  deleting,
}: {
  account: SocialAccount;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-sm mx-4 p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold">Hapus akun ini?</h3>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          Akun <strong>{account.displayName}</strong> ({account.programName}) akan dihapus permanen.
          Ticket yang sudah terhubung ke akun ini tidak akan terhapus, tapi tidak akan bisa auto-route lagi.
        </p>
        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 rounded text-xs font-medium border border-border hover:bg-muted transition-colors">
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-3 py-1.5 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 size={12} className="animate-spin" /> : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SocialAccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAccount, setEditAccount] = useState<SocialAccount | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<SocialAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      const data = await fetchSocialAccounts();
      setAccounts(data as SocialAccount[]);
    } catch (err) {
      console.error("Failed to load social accounts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const handleSave = async (data: Record<string, any>) => {
    setSaving(true);
    try {
      if (editAccount) {
        await updateSocialAccount(editAccount.id, data);
      } else {
        await addSocialAccount(data, "admin");
      }
      setShowModal(false);
      setEditAccount(null);
      await loadAccounts();
    } catch (err) {
      console.error("Failed to save social account:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteAccount) return;
    setDeleting(true);
    try {
      await deleteSocialAccount(deleteAccount.id);
      setDeleteAccount(null);
      await loadAccounts();
    } catch (err) {
      console.error("Failed to delete social account:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggle = async (account: SocialAccount) => {
    try {
      await updateSocialAccount(account.id, { isActive: !account.isActive });
      await loadAccounts();
    } catch (err) {
      console.error("Failed to toggle social account:", err);
    }
  };

  // Group by platform
  const grouped = accounts.reduce((acc, a) => {
    if (!acc[a.platform]) acc[a.platform] = [];
    acc[a.platform].push(a);
    return acc;
  }, {} as Record<string, SocialAccount[]>);

  const platformOrder: Platform[] = ["facebook", "instagram", "whatsapp_fonnte", "whatsapp_meta", "email", "call"];

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Social Accounts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola akun sosial media yang terhubung ke OMS. Setiap program bisa punya akun sendiri per platform.
          </p>
        </div>
        <button
          onClick={() => { setEditAccount(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus size={13} />
          Tambah Akun
        </button>
      </div>

      {/* Stats */}
      {!loading && accounts.length > 0 && (
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span>{accounts.length} akun terdaftar</span>
          <span>·</span>
          <span>{accounts.filter((a) => a.isActive).length} aktif</span>
          <span>·</span>
          <span>{new Set(accounts.map((a) => a.programName)).size} program</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!loading && accounts.length === 0 && (
        <Card className="border shadow-none">
          <CardContent className="p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <MessageCircle size={18} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Belum ada akun terhubung</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tambahkan akun Facebook, Instagram, atau WhatsApp untuk mulai menerima DM di OMS.
            </p>
            <button
              onClick={() => { setEditAccount(null); setShowModal(true); }}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus size={13} />
              Tambah Akun Pertama
            </button>
          </CardContent>
        </Card>
      )}

      {/* Account cards grouped by platform */}
      {!loading && platformOrder.map((platform) => {
        const accts = grouped[platform];
        if (!accts || accts.length === 0) return null;
        const pConfig = getPlatformConfig(platform);

        return (
          <div key={platform} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              <span className={cn("w-5 h-5 rounded flex items-center justify-center", pConfig.iconBg)}>
                {pConfig.icon}
              </span>
              {pConfig.label} ({accts.length})
            </div>
            <div className="flex flex-col gap-2">
              {accts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onEdit={() => { setEditAccount(account); setShowModal(true); }}
                  onDelete={() => setDeleteAccount(account)}
                  onToggle={() => handleToggle(account)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Modals */}
      {showModal && (
        <AccountModal
          initial={editAccount}
          onClose={() => { setShowModal(false); setEditAccount(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}
      {deleteAccount && (
        <DeleteModal
          account={deleteAccount}
          onClose={() => setDeleteAccount(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
}