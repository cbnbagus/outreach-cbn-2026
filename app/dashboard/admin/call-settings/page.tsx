"use client";
import { useState } from "react";
import {
  Phone, CheckCircle2, AlertCircle, ChevronDown, ChevronRight,
  Eye, EyeOff, ExternalLink, Copy, Check, Zap, Settings2,
  PhoneIncoming, PhoneOutgoing, Volume2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
type Provider = "twilio" | "vonage" | "wa_calling" | "sip" | "none";
type TestState = "idle" | "testing" | "success" | "error";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function SecretInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-xs font-mono pr-8"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border border-border bg-background hover:bg-muted transition-colors text-muted-foreground shrink-0"
    >
      {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
      {copied ? "Disalin" : "Copy"}
    </button>
  );
}

function ExpandSection({ title, children, defaultOpen = false }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium hover:bg-muted/40 transition-colors"
      >
        {title}
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>
      {open && <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/20 text-xs text-muted-foreground leading-relaxed">{children}</div>}
    </div>
  );
}

// ─── Provider card ────────────────────────────────────────────────────────────
const PROVIDERS: { id: Provider; label: string; badge?: string; color: string; bg: string; border: string; description: string; docsUrl: string }[] = [
  {
    id: "twilio", label: "Twilio", badge: "Popular",
    color: "text-red-700", bg: "bg-red-50", border: "border-red-200",
    description: "Inbound & outbound PSTN/SIP call, recording, IVR. Full REST API + TwiML.",
    docsUrl: "https://www.twilio.com/docs/voice",
  },
  {
    id: "vonage", label: "Vonage (Nexmo)",
    color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200",
    description: "Programmable voice via Vonage Voice API. Supports WebRTC and SIP trunk.",
    docsUrl: "https://developer.vonage.com/en/voice",
  },
  {
    id: "wa_calling", label: "WhatsApp Business Calling", badge: "Beta",
    color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200",
    description: "WhatsApp Voice Call via Meta Cloud API. Currently in limited beta, requires Meta approval.",
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api/phone-calls",
  },
  {
    id: "sip", label: "Custom SIP / VOIP PBX",
    color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200",
    description: "Connect on-premise PBX (Asterisk, FreePBX, 3CX) or other VoIP providers via SIP trunk.",
    docsUrl: "https://en.wikipedia.org/wiki/Session_Initiation_Protocol",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
import { FeatureGate, SetupRequestGate } from "@/components/feature-gate/FeatureGate";
import { useOrgStore } from "@/store/org-store";

function CallSettingsContent() {
  const [activeProvider, setActiveProvider] = useState<Provider>("twilio");
  const [saved, setSaved]                   = useState(false);
  const [testState, setTestState]           = useState<TestState>("idle");

  // Twilio fields
  const [twilioSid, setTwilioSid]           = useState("");
  const [twilioToken, setTwilioToken]       = useState("");
  const [twilioNumber, setTwilioNumber]     = useState("");
  const [twilioWebhook, setTwilioWebhook]   = useState("https://your-domain.com/api/calls/inbound");
  const [twilioRecord, setTwilioRecord]     = useState(true);

  // Vonage fields
  const [vonageKey, setVonageKey]           = useState("");
  const [vonageSecret, setVonageSecret]     = useState("");
  const [vonageNumber, setVonageNumber]     = useState("");
  const [vonageAppId, setVonageAppId]       = useState("");

  // WhatsApp Calling fields
  const [waToken, setWaToken]               = useState("");
  const [waPhoneId, setWaPhoneId]           = useState("");

  // SIP fields
  const [sipServer, setSipServer]           = useState("");
  const [sipUser, setSipUser]               = useState("");
  const [sipPassword, setSipPassword]       = useState("");
  const [sipPort, setSipPort]               = useState("5060");

  // General
  const [inboundEnabled, setInboundEnabled] = useState(true);
  const [outboundEnabled, setOutboundEnabled] = useState(true);
  const [maxConcurrent, setMaxConcurrent]   = useState("5");
  const [callTimeout, setCallTimeout]       = useState("30");

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTest = () => {
    setTestState("testing");
    setTimeout(() => {
      // Simulate: success if at least one credential field filled
      const hasCredentials =
        (activeProvider === "twilio"     && twilioSid && twilioToken) ||
        (activeProvider === "vonage"     && vonageKey && vonageSecret) ||
        (activeProvider === "wa_calling" && waToken && waPhoneId) ||
        (activeProvider === "sip"        && sipServer && sipUser);
      setTestState(hasCredentials ? "success" : "error");
      setTimeout(() => setTestState("idle"), 4000);
    }, 1800);
  };

  const webhookBaseUrl = "https://your-domain.com/api/calls";

  return (
    <div className="flex flex-col gap-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Call Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select a provider, enter credentials, and configure inbound/outbound call behavior.
          </p>
        </div>
        <Button size="sm" onClick={handleSave} className="text-xs h-8 gap-1.5">
          {saved ? <><CheckCircle2 size={12} className="text-white" /> Saved</> : <><Settings2 size={12} />Save Configuration</>}
        </Button>
      </div>

      {/* Provider selector */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Select Provider</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveProvider(p.id)}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border text-left transition-all",
                activeProvider === p.id
                  ? `${p.border} ${p.bg} ring-2 ring-offset-1 ring-current`
                  : "border-border bg-card hover:bg-muted/30"
              )}
            >
              <div className={cn("w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0", p.bg, "border", p.border)}>
                <Phone size={14} className={p.color} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-semibold", activeProvider === p.id ? p.color : "text-foreground")}>{p.label}</span>
                  {p.badge && (
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", p.bg, p.border, p.color)}>
                      {p.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{p.description}</p>
              </div>
              {activeProvider === p.id && (
                <CheckCircle2 size={14} className={cn("flex-shrink-0 mt-0.5", p.color)} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Credentials section */}
      <Card className="border border-border shadow-none">
        <CardHeader className="px-5 pt-4 pb-3 border-b border-border flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">
              {PROVIDERS.find((p) => p.id === activeProvider)?.label} — Credentials
            </CardTitle>
            <a
              href={PROVIDERS.find((p) => p.id === activeProvider)?.docsUrl}
              target="_blank" rel="noreferrer"
              className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-0.5"
            >
              View docs <ExternalLink size={9} />
            </a>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testState === "testing"}
            className="text-xs h-7 gap-1.5"
          >
            {testState === "testing" && <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />}
            {testState === "success" && <CheckCircle2 size={12} className="text-emerald-600" />}
            {testState === "error"   && <AlertCircle  size={12} className="text-red-500" />}
            {testState === "idle"    && <Zap size={12} />}
            {testState === "testing" ? "Testing..." : testState === "success" ? "Success!" : testState === "error" ? "Failed" : "Test Connection"}
          </Button>
        </CardHeader>
        <CardContent className="p-5 flex flex-col gap-4">

          {/* TWILIO */}
          {activeProvider === "twilio" && (
            <>
              <Field label="Account SID">
                <Input value={twilioSid} onChange={(e) => setTwilioSid(e.target.value)} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="h-8 text-xs font-mono" />
              </Field>
              <Field label="Auth Token">
                <SecretInput value={twilioToken} onChange={setTwilioToken} placeholder="Auth token from Twilio Console" />
              </Field>
              <Field label="Twilio Phone Number" hint="Format E.164: +62811xxxxxxx">
                <Input value={twilioNumber} onChange={(e) => setTwilioNumber(e.target.value)} placeholder="+16505551234" className="h-8 text-xs font-mono" />
              </Field>
              <Field label="Inbound Webhook URL" hint="Paste this URL in Twilio Console → Phone Number → Voice → Webhook">
                <div className="flex items-center gap-2">
                  <Input value={twilioWebhook} onChange={(e) => setTwilioWebhook(e.target.value)} className="h-8 text-xs font-mono" />
                  <CopyButton text={twilioWebhook} />
                </div>
              </Field>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                <div>
                  <p className="text-xs font-medium">Record all calls</p>
                  <p className="text-[10px] text-muted-foreground">Recording stored in Twilio and URL saved in call log</p>
                </div>
                <button
                  onClick={() => setTwilioRecord((r) => !r)}
                  className={cn("w-9 h-5 rounded-full transition-colors relative", twilioRecord ? "bg-primary" : "bg-muted-foreground/30")}
                >
                  <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", twilioRecord ? "translate-x-4" : "translate-x-0.5")} />
                </button>
              </div>
              <ExpandSection title="How to set up in Twilio Console">
                <ol className="flex flex-col gap-2 list-decimal list-inside">
                  <li>Go to <a href="https://console.twilio.com" target="_blank" rel="noreferrer" className="text-primary underline">console.twilio.com</a> and copy <strong>Account SID</strong> & <strong>Auth Token</strong> from dashboard.</li>
                  <li>Beli nomor telepon: <strong>Phone Numbers → Buy a number</strong>.</li>
                  <li>Click the purchased number → <strong>Voice & Fax → Webhook</strong>: paste the URL above.</li>
                  <li>Untuk outbound, pastikan <strong>Geographic Permissions</strong> mengizinkan kode negara tujuan.</li>
                  <li>Click "Test Connection" above — if it fails, check SID and token.</li>
                </ol>
              </ExpandSection>
            </>
          )}

          {/* VONAGE */}
          {activeProvider === "vonage" && (
            <>
              <Field label="API Key">
                <Input value={vonageKey} onChange={(e) => setVonageKey(e.target.value)} placeholder="xxxxxxxx" className="h-8 text-xs font-mono" />
              </Field>
              <Field label="API Secret">
                <SecretInput value={vonageSecret} onChange={setVonageSecret} placeholder="API Secret from Vonage Dashboard" />
              </Field>
              <Field label="Application ID (Voice App)">
                <Input value={vonageAppId} onChange={(e) => setVonageAppId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="h-8 text-xs font-mono" />
              </Field>
              <Field label="Virtual Number">
                <Input value={vonageNumber} onChange={(e) => setVonageNumber(e.target.value)} placeholder="+62811xxxxxxx" className="h-8 text-xs font-mono" />
              </Field>
              <ExpandSection title="Cara setup di Vonage Dashboard">
                <ol className="flex flex-col gap-2 list-decimal list-inside">
                  <li>Go to <a href="https://dashboard.nexmo.com" target="_blank" rel="noreferrer" className="text-primary underline">dashboard.nexmo.com</a>, copy API Key dan Secret.</li>
                  <li>Buat Voice Application: <strong>Applications → Create a new application</strong>, aktifkan Voice capability.</li>
                  <li>Set Answer URL ke <code className="bg-muted px-1 rounded">{webhookBaseUrl}/vonage/answer</code> dan Event URL ke <code className="bg-muted px-1 rounded">{webhookBaseUrl}/vonage/event</code>.</li>
                  <li>Link virtual number to application.</li>
                </ol>
              </ExpandSection>
            </>
          )}

          {/* WHATSAPP CALLING */}
          {activeProvider === "wa_calling" && (
            <>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertCircle size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-800 leading-relaxed">
                  WhatsApp Business Calling API is currently in <strong>limited beta</strong>. You need to apply for access from Meta and get approval before this feature is active.
                  <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/phone-calls" target="_blank" rel="noreferrer" className="underline ml-1">Info lebih lanjut</a>.
                </p>
              </div>
              <Field label="Access Token (Meta Business)">
                <SecretInput value={waToken} onChange={setWaToken} placeholder="EAAxxxxxxx..." />
              </Field>
              <Field label="Phone Number ID">
                <Input value={waPhoneId} onChange={(e) => setWaPhoneId(e.target.value)} placeholder="1234567890123456" className="h-8 text-xs font-mono" />
              </Field>
              <ExpandSection title="Cara mendapatkan akses WhatsApp Calling">
                <ol className="flex flex-col gap-2 list-decimal list-inside">
                  <li>Pastikan bisnis Anda sudah terverifikasi di Meta Business Manager.</li>
                  <li>Register for the beta program via Meta Partner Portal.</li>
                  <li>Setelah disetujui, aktifkan "Calls" di <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-primary underline">App Dashboard</a> → WhatsApp → Configuration.</li>
                  <li>Use a Permanent Page Access Token with scope <code className="bg-muted px-1 rounded">whatsapp_business_messaging</code>.</li>
                </ol>
              </ExpandSection>
            </>
          )}

          {/* SIP / VOIP PBX */}
          {activeProvider === "sip" && (
            <>
              <Field label="SIP Server / PBX Host">
                <Input value={sipServer} onChange={(e) => setSipServer(e.target.value)} placeholder="pbx.yourdomain.com or 192.168.1.10" className="h-8 text-xs font-mono" />
              </Field>
              <Field label="SIP Username / Extension">
                <Input value={sipUser} onChange={(e) => setSipUser(e.target.value)} placeholder="1001 atau sip_user" className="h-8 text-xs font-mono" />
              </Field>
              <Field label="SIP Password">
                <SecretInput value={sipPassword} onChange={setSipPassword} placeholder="SIP account password" />
              </Field>
              <Field label="Port" hint="Default: 5060 (UDP/TCP), 5061 (TLS)">
                <Input value={sipPort} onChange={(e) => setSipPort(e.target.value)} placeholder="5060" className="h-8 text-xs font-mono w-32" />
              </Field>
              <ExpandSection title="Supported PBX/VoIP providers">
                <div className="flex flex-wrap gap-2">
                  {["Asterisk", "FreePBX", "3CX", "Kamailio", "Zoiper", "Twilio Elastic SIP", "Vonage SIP", "Zadarma", "DIDWW"].map((p) => (
                    <span key={p} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-background border border-border">{p}</span>
                  ))}
                </div>
              </ExpandSection>
            </>
          )}

        </CardContent>
      </Card>

      {/* General call behavior */}
      <Card className="border border-border shadow-none">
        <CardHeader className="px-5 pt-4 pb-3 border-b border-border">
          <CardTitle className="text-sm font-semibold">Call Behavior</CardTitle>
        </CardHeader>
        <CardContent className="p-5 flex flex-col gap-4">

          {/* Inbound / Outbound toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Inbound Call",  icon: PhoneIncoming,  val: inboundEnabled,  set: setInboundEnabled,
                desc: "Accept incoming calls from respondents" },
              { label: "Outbound Call", icon: PhoneOutgoing, val: outboundEnabled, set: setOutboundEnabled,
                desc: "Agents can initiate outbound calls" },
            ].map(({ label, icon: Icon, val, set, desc }) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <Icon size={14} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => set((v: boolean) => !v)}
                  className={cn("w-9 h-5 rounded-full transition-colors relative flex-shrink-0", val ? "bg-primary" : "bg-muted-foreground/30")}
                >
                  <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", val ? "translate-x-4" : "translate-x-0.5")} />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Max Concurrent Calls" hint="Per-instance limit">
              <Input value={maxConcurrent} onChange={(e) => setMaxConcurrent(e.target.value)} className="h-8 text-xs" type="number" min="1" max="50" />
            </Field>
            <Field label="Ring Timeout (seconds)" hint="Seconds before missed">
              <Input value={callTimeout} onChange={(e) => setCallTimeout(e.target.value)} className="h-8 text-xs" type="number" min="10" max="120" />
            </Field>
          </div>

          {/* Webhook URLs read-only */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Webhook Endpoints</p>
            {[
              { label: "Inbound call webhook",  path: "/inbound"  },
              { label: "Call status callback",  path: "/status"   },
              { label: "Recording callback",    path: "/recording"},
            ].map(({ label, path }) => {
              const url = `${webhookBaseUrl}${path}`;
              return (
                <div key={path} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <code className="text-[10px] font-mono text-foreground truncate block">{url}</code>
                  </div>
                  <CopyButton text={url} />
                </div>
              );
            })}
          </div>

          {/* Sound / Ringtone */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
            <Volume2 size={14} className="text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">Inbound Ringtone</p>
              <p className="text-[10px] text-muted-foreground">Sound played when there is an incoming call in SoftPhone</p>
            </div>
            <select className="h-7 text-xs border border-border rounded-md bg-background px-2">
              <option>Classic Ring</option>
              <option>Soft Chime</option>
              <option>Digital Beep</option>
              <option>Silent</option>
            </select>
          </div>

        </CardContent>
      </Card>

      {/* Save footer */}
      <div className="flex items-center justify-end gap-2 pb-4">
        <Button variant="outline" size="sm" className="text-xs h-8">Reset to Default</Button>
        <Button size="sm" onClick={handleSave} className="text-xs h-8 gap-1.5">
          {saved ? <><CheckCircle2 size={12} />Saved</> : "Save Configuration"}
        </Button>
      </div>

    </div>
  );
}

// ─── Field helper ─────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
        {hint && <span className="text-[9px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function CallSettingsPage() {
  const plan = (useOrgStore((s) => s.activeOrg?.plan) ?? "free") as "free" | "starter" | "growth" | "enterprise";
  return (
    <FeatureGate feature="callFeature">
      <SetupRequestGate plan={plan} selfServiceMinPlan="enterprise" featureLabel="Call / Telephony" setupFee="$49">
        <CallSettingsContent />
      </SetupRequestGate>
    </FeatureGate>
  );
}
