"use client";
import { useState } from "react";
import {
  Copy, Check, MessageCircle, Instagram, Facebook,
  Phone, ExternalLink, ChevronDown, ChevronRight, Terminal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function CopyButton({ text, id }: { text: string; id: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border border-border bg-background hover:bg-muted transition-colors text-muted-foreground shrink-0"
    >
      {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
      {copied ? "Disalin" : "Copy"}
    </button>
  );
}

function CodeBlock({ children, id }: { children: string; id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative mt-2">
      <pre className="bg-muted/60 border border-border rounded-md text-[11px] font-mono p-3 pr-16 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
        {children}
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border border-border bg-background hover:bg-muted transition-colors text-muted-foreground"
      >
        {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
        {copied ? "Disalin" : "Copy"}
      </button>
    </div>
  );
}

function ExpandSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium hover:bg-muted/40 transition-colors"
      >
        {title}
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-border bg-muted/20">{children}</div>}
    </div>
  );
}

// ─── Channel card ─────────────────────────────────────────────────────────────
function ChannelCard({
  icon, iconBg, iconColor, title, functionName, verifyToken, verifyTokenKey,
  setupSteps, testCurl, projectId,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor?: string;
  title: string;
  functionName: string;
  verifyToken?: string;
  verifyTokenKey?: string;
  setupSteps: React.ReactNode;
  testCurl: (url: string) => string;
  projectId: string;
}) {
  const region = "asia-southeast1";
  const url = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;

  return (
    <Card className="border border-border shadow-none">
      <CardHeader className="px-5 pt-5 pb-3 border-b border-border">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <div className={cn("w-7 h-7 rounded-md flex items-center justify-center", iconBg)}>
            <span className={iconColor}>{icon}</span>
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 flex flex-col gap-4">

        {/* Webhook / Callback URL */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Webhook URL (Firebase Function)
          </label>
          <div className="flex items-center gap-2">
            <Input readOnly value={url} className="h-8 text-xs font-mono bg-muted/40" />
            <CopyButton text={url} id={`${functionName}-url`} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Ganti <code className="bg-muted px-1 rounded">YOUR_PROJECT_ID</code> dengan Firebase project ID Anda jika berbeda.
          </p>
        </div>

        {/* Verify token (Meta channels only) */}
        {verifyToken && verifyTokenKey && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Verify Token
            </label>
            <div className="flex items-center gap-2">
              <Input readOnly value={verifyToken} className="h-8 text-xs font-mono bg-muted/40" />
              <CopyButton text={verifyToken} id={`${functionName}-token`} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Set via: <code className="bg-muted px-1 rounded font-mono">{`firebase functions:secrets:set ${verifyTokenKey}`}</code>
            </p>
          </div>
        )}

        <ExpandSection title="Cara setup">{setupSteps}</ExpandSection>
        <ExpandSection title="Test dengan curl">
          <CodeBlock id={`${functionName}-curl`}>{testCurl(url)}</CodeBlock>
        </ExpandSection>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const [projectId, setProjectId] = useState("crm-outreach-7deee");

  return (
    <div className="flex flex-col gap-6 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-base font-semibold">Integrations</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Webhook berjalan sebagai <strong>Firebase Cloud Functions</strong>. Setiap pesan/call masuk otomatis membuat respondent dan ticket baru di Firestore.
        </p>
      </div>

      {/* Project ID input */}
      <Card className="border border-border shadow-none">
        <CardContent className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <Terminal size={14} className="text-muted-foreground" />
            <span className="text-xs font-semibold">Firebase Project ID</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-8 text-xs font-mono"
              placeholder="your-firebase-project-id"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Ubah project ID di atas untuk menghasilkan URL yang benar. Lihat di <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-0.5">Firebase Console <ExternalLink size={9} /></a>.
          </p>
        </CardContent>
      </Card>

      {/* Deploy instructions */}
      <Card className="border border-amber-200 bg-amber-50 shadow-none">
        <CardContent className="p-4 flex flex-col gap-2">
          <p className="text-xs font-semibold text-amber-800">Langkah deploy Cloud Functions</p>
          <ol className="flex flex-col gap-1.5 text-xs text-amber-800 list-decimal list-inside leading-relaxed">
            <li>Install Firebase CLI: <code className="bg-amber-100 px-1 rounded font-mono">npm install -g firebase-tools</code></li>
            <li>Login: <code className="bg-amber-100 px-1 rounded font-mono">firebase login</code></li>
            <li>Masuk ke folder functions: <code className="bg-amber-100 px-1 rounded font-mono">cd functions && npm install</code></li>
            <li>Set verify tokens: <code className="bg-amber-100 px-1 rounded font-mono">firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN</code> (ulangi untuk IG, FB, dll)</li>
            <li>Deploy: <code className="bg-amber-100 px-1 rounded font-mono">firebase deploy --only functions</code></li>
          </ol>
          <p className="text-[10px] text-amber-700 mt-1">
            Functions akan ter-deploy ke region <strong>asia-southeast1 (Singapore)</strong> untuk latensi rendah dari Indonesia.
          </p>
        </CardContent>
      </Card>

      {/* WhatsApp Meta */}
      <ChannelCard
        projectId={projectId}
        functionName="webhookWhatsapp"
        title="WhatsApp Business Cloud API (Meta)"
        icon={<MessageCircle size={14} />}
        iconBg="bg-emerald-100"
        iconColor="text-emerald-700"
        verifyToken="oms_wa_token"
        verifyTokenKey="WHATSAPP_VERIFY_TOKEN"
        testCurl={(url) => `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '{
  "entry": [{
    "changes": [{
      "value": {
        "contacts": [{"wa_id":"628123456789","profile":{"name":"Budi Santoso"}}],
        "messages": [{"from":"628123456789","type":"text","text":{"body":"Halo, saya ingin bertanya"}}]
      }
    }]
  }]
}'`}
        setupSteps={
          <ol className="flex flex-col gap-2 text-xs text-muted-foreground list-decimal list-inside leading-relaxed">
            <li>Buka <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-primary underline">developers.facebook.com</a> dan pilih app Anda.</li>
            <li>Buka <strong>WhatsApp → Configuration → Webhooks</strong>.</li>
            <li>Masukkan <em>Callback URL</em> di atas dan <em>Verify Token</em> yang sama dengan nilai secret <code className="bg-muted px-1 rounded">WHATSAPP_VERIFY_TOKEN</code>.</li>
            <li>Subscribe ke field: <code className="bg-muted px-1 rounded">messages</code>.</li>
          </ol>
        }
      />

      {/* WhatsApp Fonnte */}
      <ChannelCard
        projectId={projectId}
        functionName="webhookFonnte"
        title="WhatsApp via Fonnte / Wablas"
        icon={<MessageCircle size={14} />}
        iconBg="bg-emerald-100"
        iconColor="text-emerald-700"
        testCurl={(url) => `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '{"sender":"628123456789","name":"Budi Santoso","message":"Halo, ingin bertanya"}'`}
        setupSteps={
          <ol className="flex flex-col gap-2 text-xs text-muted-foreground list-decimal list-inside leading-relaxed">
            <li>Login ke <a href="https://fonnte.com" target="_blank" rel="noreferrer" className="text-primary underline">fonnte.com</a> atau dashboard Wablas.</li>
            <li>Pilih device → <strong>Settings → Webhook URL</strong>.</li>
            <li>Paste URL Function di atas, klik Save.</li>
            <li>Opsional: set token di Fonnte dan jalankan <code className="bg-muted px-1 rounded font-mono">firebase functions:secrets:set FONNTE_WEBHOOK_TOKEN</code>.</li>
          </ol>
        }
      />

      {/* Instagram */}
      <ChannelCard
        projectId={projectId}
        functionName="webhookInstagram"
        title="Instagram Direct Message"
        icon={<Instagram size={14} />}
        iconBg="bg-pink-100"
        iconColor="text-pink-700"
        verifyToken="oms_ig_token"
        verifyTokenKey="INSTAGRAM_VERIFY_TOKEN"
        testCurl={(url) => `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '{
  "entry": [{
    "messaging": [{
      "sender": {"id": "17841400000000"},
      "message": {"text": "Halo, saya mau tanya tentang produk"}
    }]
  }]
}'`}
        setupSteps={
          <ol className="flex flex-col gap-2 text-xs text-muted-foreground list-decimal list-inside leading-relaxed">
            <li>Buka Meta Developer Console → pilih app → <strong>Instagram → Webhooks</strong>.</li>
            <li>Masukkan <em>Callback URL</em> dan <em>Verify Token</em> (sama dengan secret <code className="bg-muted px-1 rounded">INSTAGRAM_VERIFY_TOKEN</code>).</li>
            <li>Subscribe ke field: <code className="bg-muted px-1 rounded">messages</code>.</li>
            <li>Pastikan Instagram account terhubung ke Facebook Page dan Page terhubung ke app.</li>
          </ol>
        }
      />

      {/* Facebook */}
      <ChannelCard
        projectId={projectId}
        functionName="webhookFacebook"
        title="Facebook Messenger"
        icon={<Facebook size={14} />}
        iconBg="bg-blue-100"
        iconColor="text-blue-700"
        verifyToken="oms_fb_token"
        verifyTokenKey="FACEBOOK_VERIFY_TOKEN"
        testCurl={(url) => `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '{
  "entry": [{
    "messaging": [{
      "sender": {"id": "10000000000001"},
      "message": {"text": "Halo, minta informasi program"}
    }]
  }]
}'`}
        setupSteps={
          <ol className="flex flex-col gap-2 text-xs text-muted-foreground list-decimal list-inside leading-relaxed">
            <li>Buka Meta Developer Console → pilih app → <strong>Messenger → Configuration → Webhooks</strong>.</li>
            <li>Masukkan <em>Callback URL</em> dan <em>Verify Token</em> (sama dengan secret <code className="bg-muted px-1 rounded">FACEBOOK_VERIFY_TOKEN</code>).</li>
            <li>Subscribe ke field: <code className="bg-muted px-1 rounded">messages</code>.</li>
            <li>Pastikan Facebook Page sudah disubscribe ke app.</li>
          </ol>
        }
      />

      {/* Call */}
      <ChannelCard
        projectId={projectId}
        functionName="webhookCall"
        title="Inbound Call (VOIP / PBX / Manual)"
        icon={<Phone size={14} />}
        iconBg="bg-amber-100"
        iconColor="text-amber-700"
        testCurl={(url) => `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '{"phone":"+628123456789","name":"Budi Santoso","subject":"Inbound call — minta callback"}'`}
        setupSteps={
          <ol className="flex flex-col gap-2 text-xs text-muted-foreground list-decimal list-inside leading-relaxed">
            <li>Konfigurasikan PBX/VOIP Anda untuk POST ke URL di atas setiap ada panggilan masuk.</li>
            <li>Body minimal: <code className="bg-muted px-1 rounded font-mono">{"{ phone: '+62...', name: '...' }"}</code>.</li>
            <li>Opsional: tambahkan Authorization header dan set secret <code className="bg-muted px-1 rounded font-mono">CALL_WEBHOOK_TOKEN</code>.</li>
            <li>Untuk input manual, gunakan endpoint yang sama dari form internal atau script.</li>
          </ol>
        }
      />

    </div>
  );
}
