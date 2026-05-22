"use client";
import { useState, useEffect } from "react";
import {
  Copy, Check, MessageCircle, Instagram, Facebook,
  Phone, ExternalLink, ChevronDown, ChevronRight, Terminal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useOrgStore } from "@/store/org-store";
import { SetupRequestGate } from "@/components/feature-gate/FeatureGate";
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
  setupSteps, testCurl, projectId, orgId,
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
  orgId: string;
}) {
  const region = "asia-southeast1";
  const url = `https://${region}-${projectId}.cloudfunctions.net/${functionName}?org=${orgId}`;

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

        <ExpandSection title="How to set up">{setupSteps}</ExpandSection>
        <ExpandSection title="Test with curl">
          <CodeBlock id={`${functionName}-curl`}>{testCurl(url)}</CodeBlock>
        </ExpandSection>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "reachthesoul-prod";
  const orgId = useOrgStore((s) => s.activeOrg?.orgId ?? "");
  const plan = (useOrgStore((s) => s.activeOrg?.plan) ?? "free") as "free" | "starter" | "growth" | "enterprise";

  // Channel config state
  const [waProvider, setWaProvider] = useState("fonnte");
  const [fonnteToken, setFonnteToken] = useState("");
  const [fonnteDeviceNumber, setFonnteDeviceNumber] = useState("");
  const [metaPhoneId, setMetaPhoneId] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [metaAppSecret, setMetaAppSecret] = useState("");
  const [fbPageToken, setFbPageToken] = useState("");
  const [igToken, setIgToken] = useState("");
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [showTokens, setShowTokens] = useState(false);

  // Load channel config from org
  useEffect(() => {
    if (!orgId || configLoaded) return;
    async function loadConfig() {
      try {
        const [{ doc, getDoc }, { db }] = await Promise.all([
          import("firebase/firestore"), import("@/lib/firebase"),
        ]);
        const snap = await getDoc(doc(db, "organizations", orgId));
        if (snap.exists()) {
          const cc = snap.data()?.channelConfig ?? {};
          setWaProvider(cc.active_whatsapp_provider ?? "fonnte");
          setFonnteToken(cc.fonnte_token ?? "");
          setFonnteDeviceNumber(cc.fonnte_device_number ?? "");
          setMetaPhoneId(cc.meta_phone_number_id ?? "");
          setMetaToken(cc.meta_access_token ?? "");
          setMetaAppSecret(cc.meta_app_secret ?? "");
          setFbPageToken(cc.facebook_page_token ?? "");
          setIgToken(cc.instagram_token ?? "");
        }
        setConfigLoaded(true);
      } catch (err) {
        console.error("Failed to load channel config:", err);
        setConfigLoaded(true);
      }
    }
    loadConfig();
  }, [orgId, configLoaded]);

  const saveChannelConfig = async () => {
    if (!orgId) return;
    setConfigSaving(true);
    try {
      const [{ doc, updateDoc, serverTimestamp }, { db }] = await Promise.all([
        import("firebase/firestore"), import("@/lib/firebase"),
      ]);
      await updateDoc(doc(db, "organizations", orgId), {
        channelConfig: {
          active_whatsapp_provider: waProvider,
          fonnte_token: fonnteToken.trim(),
          fonnte_device_number: fonnteDeviceNumber.trim().replace(/\D/g, ""),
          meta_phone_number_id: metaPhoneId.trim(),
          meta_access_token: metaToken.trim(),
          meta_app_secret: metaAppSecret.trim(),
          facebook_page_token: fbPageToken.trim(),
          instagram_token: igToken.trim(),
        },
        updatedAt: serverTimestamp(),
      });
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save channel config:", err);
      alert("Failed to save. Please try again.");
    }
    setConfigSaving(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-base font-semibold">Integrations</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Connect your messaging channels. Enter your credentials below, then set up webhooks to start receiving messages.
        </p>
      </div>

      {/* ═══ CHANNEL CREDENTIALS ═══ */}
      <SetupRequestGate plan={plan} selfServiceMinPlan="growth" featureLabel="Channel Integration" setupFee="$29 - $49">
      {/* Note for Growth users: free setup as compliment */}
      {plan === "growth" && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
          <p className="text-xs text-green-800 font-medium">🎉 Free setup included with your Growth plan!</p>
          <p className="text-[10px] text-green-700 mt-1">Need help? Contact hello@reachthesoul.org and we'll set up your channels for free.</p>
        </div>
      )}
      <Card className="border-2 border-primary/30 shadow-none">
        <CardHeader className="px-5 pt-5 pb-3 border-b border-border">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
              <MessageCircle size={14} className="text-primary" />
            </div>
            Channel Credentials
          </CardTitle>
          <p className="text-[10px] text-muted-foreground mt-1">
            Enter your API tokens here. They are saved securely to your organization and used by Cloud Functions to send replies.
          </p>
        </CardHeader>
        <CardContent className="p-5 flex flex-col gap-5">

          {/* WhatsApp Provider */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">WhatsApp Provider</label>
            <div className="flex gap-2">
              <button onClick={() => setWaProvider("fonnte")} className={cn("flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all", waProvider === "fonnte" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30")}>
                WhatsApp Quick Connect
              </button>
              <button onClick={() => setWaProvider("meta")} className={cn("flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all", waProvider === "meta" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30")}>
                WhatsApp Business API
              </button>
            </div>
          </div>

          {/* Fonnte config */}
          {waProvider === "fonnte" && (
            <div className="p-4 rounded-lg bg-green-50/50 border border-green-200">
              <p className="text-xs font-semibold text-green-800 mb-2">WhatsApp Quick Connect</p>
              <p className="text-[10px] text-green-700 mb-3">Enter the device token provided during your onboarding setup.</p>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Device Token</label>
                  <Input
                    type={showTokens ? "text" : "password"}
                    value={fonnteToken}
                    onChange={(e) => setFonnteToken(e.target.value)}
                    placeholder="e.g. 9kRcuqZiM8PqhDuZZfdu"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Your WhatsApp Number (Device Number)</label>
                  <Input
                    type="text"
                    value={fonnteDeviceNumber}
                    onChange={(e) => setFonnteDeviceNumber(e.target.value)}
                    placeholder="e.g. 6285974773341 (without +)"
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[9px] text-green-600 mt-1">This is used to prevent AI from replying to its own messages (loop prevention).</p>
                </div>
              </div>
            </div>
          )}

          {/* Meta config */}
          {waProvider === "meta" && (
            <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-200">
              <p className="text-xs font-semibold text-blue-800 mb-2">Meta WhatsApp Cloud API</p>
              <p className="text-[10px] text-blue-700 mb-3">Get credentials from <a href="https://developers.facebook.com" target="_blank" className="underline">developers.facebook.com</a> → Your App → WhatsApp</p>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Phone Number ID</label>
                  <Input type="text" value={metaPhoneId} onChange={(e) => setMetaPhoneId(e.target.value)} placeholder="e.g. 123456789012345" className="h-8 text-xs font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Permanent Access Token</label>
                  <Input type={showTokens ? "text" : "password"} value={metaToken} onChange={(e) => setMetaToken(e.target.value)} placeholder="EAAxxxxxxx..." className="h-8 text-xs font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">App Secret (for webhook verification)</label>
                  <Input type={showTokens ? "text" : "password"} value={metaAppSecret} onChange={(e) => setMetaAppSecret(e.target.value)} placeholder="abc123def456..." className="h-8 text-xs font-mono" />
                </div>
              </div>
            </div>
          )}

          {/* Facebook */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Facebook Page Token <span className="text-muted-foreground/50">(optional)</span></label>
            <Input type={showTokens ? "text" : "password"} value={fbPageToken} onChange={(e) => setFbPageToken(e.target.value)} placeholder="Page Access Token" className="h-8 text-xs font-mono" />
          </div>

          {/* Instagram */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Instagram Token <span className="text-muted-foreground/50">(optional)</span></label>
            <Input type={showTokens ? "text" : "password"} value={igToken} onChange={(e) => setIgToken(e.target.value)} placeholder="Instagram Graph API Token" className="h-8 text-xs font-mono" />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <button onClick={() => setShowTokens(!showTokens)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              {showTokens ? "🙈 Hide tokens" : "👁 Show tokens"}
            </button>
            <div className="flex items-center gap-2">
              {configSaved && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><Check size={12} /> Saved!</span>}
              <button onClick={saveChannelConfig} disabled={configSaving} className="px-4 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {configSaving ? "Saving..." : "Save Credentials"}
              </button>
            </div>
          </div>

        </CardContent>
      </Card>
      </SetupRequestGate>

      {/* ═══ WEBHOOK URLS — Enterprise only (technical details) ═══ */}
      {plan === "enterprise" && (
      <>
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-1">Technical Setup — Webhook URLs</h2>
        <p className="text-[10px] text-muted-foreground mb-3">
          For advanced integrations. Configure these webhook URLs in your messaging provider dashboard.
        </p>
      </div>

      {/* WhatsApp Meta */}
      <ChannelCard
        projectId={projectId} orgId={orgId}
        functionName="webhookWhatsapp"
        title="WhatsApp Business Cloud API (Meta)"
        icon={<MessageCircle size={14} />}
        iconBg="bg-emerald-100"
        iconColor="text-emerald-700"
        verifyToken="rts_wa_token"
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
            <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-primary underline">developers.facebook.com</a> and select your app.</li>
            <li>Go to <strong>WhatsApp → Configuration → Webhooks</strong>.</li>
            <li>Enter the <em>Callback URL</em> above and the <em>Verify Token</em>.</li>
            <li>Subscribe to field: <code className="bg-muted px-1 rounded">messages</code>.</li>
          </ol>
        }
      />

      {/* WhatsApp Fonnte */}
      <ChannelCard
        projectId={projectId} orgId={orgId}
        functionName="webhookFonnte"
        title="WhatsApp Quick Connect Webhook"
        icon={<MessageCircle size={14} />}
        iconBg="bg-emerald-100"
        iconColor="text-emerald-700"
        testCurl={(url) => `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '{"sender":"628123456789","name":"Budi Santoso","message":"Halo, ingin bertanya"}'`}
        setupSteps={
          <ol className="flex flex-col gap-2 text-xs text-muted-foreground list-decimal list-inside leading-relaxed">
            <li>Go to your WhatsApp gateway provider dashboard.</li>
            <li>Navigate to <strong>Device Settings → Webhook URL</strong>.</li>
            <li>Paste the webhook URL above, click Save.</li>
          </ol>
        }
      />

      {/* ═══ SOCIAL MEDIA WEBHOOKS ═══ */}
      <div className="mt-4">
        <h2 className="text-sm font-semibold text-foreground mb-1">Webhook URLs — Social Media</h2>
        <p className="text-[10px] text-muted-foreground mb-3">
          Connect Instagram, Facebook, and other social channels.
        </p>
      </div>

      {/* Instagram */}
      <ChannelCard
        projectId={projectId} orgId={orgId}
        functionName="webhookInstagram"
        title="Instagram Direct Message"
        icon={<Instagram size={14} />}
        iconBg="bg-pink-100"
        iconColor="text-pink-700"
        verifyToken="rts_ig_token"
        verifyTokenKey="INSTAGRAM_VERIFY_TOKEN"
        testCurl={(url) => `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '{"entry": [{"messaging": [{"sender": {"id": "17841400000000"},"message": {"text": "Hello"}}]}]}'`}
        setupSteps={
          <ol className="flex flex-col gap-2 text-xs text-muted-foreground list-decimal list-inside leading-relaxed">
            <li>Go to Meta Developer Console → your app → <strong>Instagram → Webhooks</strong>.</li>
            <li>Enter the <em>Callback URL</em> and <em>Verify Token</em>.</li>
            <li>Subscribe to field: <code className="bg-muted px-1 rounded">messages</code>.</li>
          </ol>
        }
      />

      {/* Facebook */}
      <ChannelCard
        projectId={projectId} orgId={orgId}
        functionName="webhookFacebook"
        title="Facebook Messenger"
        icon={<Facebook size={14} />}
        iconBg="bg-blue-100"
        iconColor="text-blue-700"
        verifyToken="rts_fb_token"
        verifyTokenKey="FACEBOOK_VERIFY_TOKEN"
        testCurl={(url) => `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '{"entry": [{"messaging": [{"sender": {"id": "10000000000001"},"message": {"text": "Hello"}}]}]}'`}
        setupSteps={
          <ol className="flex flex-col gap-2 text-xs text-muted-foreground list-decimal list-inside leading-relaxed">
            <li>Go to Meta Developer Console → your app → <strong>Messenger → Webhooks</strong>.</li>
            <li>Enter the <em>Callback URL</em> and <em>Verify Token</em>.</li>
            <li>Subscribe to field: <code className="bg-muted px-1 rounded">messages</code>.</li>
          </ol>
        }
      />

      </>
      )}

      {/* Call — Enterprise only */}
      {plan === "enterprise" && (
      <ChannelCard
        projectId={projectId} orgId={orgId}
        functionName="webhookCall"
        title="Inbound Call (VOIP / PBX / Manual)"
        icon={<Phone size={14} />}
        iconBg="bg-amber-100"
        iconColor="text-amber-700"
        testCurl={(url) => `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '{"phone":"+628123456789","name":"Budi Santoso","subject":"Inbound call"}'`}
        setupSteps={
          <ol className="flex flex-col gap-2 text-xs text-muted-foreground list-decimal list-inside leading-relaxed">
            <li>Configure your PBX/VoIP to POST to the URL above for every incoming call.</li>
            <li>Body minimal: <code className="bg-muted px-1 rounded font-mono">{"{ phone: '+62...', name: '...' }"}</code>.</li>
            <li>For manual input, use the same endpoint from internal forms or scripts.</li>
          </ol>
        }
      />
      )}

    </div>
  );
}
