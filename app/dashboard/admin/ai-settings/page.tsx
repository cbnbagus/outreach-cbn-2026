"use client";
import { useState, useEffect } from "react";
import {
  Bot, Save, RotateCcw, Plus, Trash2, Shield, Zap, Key, Eye, EyeOff,
  HandHeart, HeartHandshake, Droplets, AlertTriangle, UserCog, Sparkles,
  ChevronDown, ChevronUp, TestTube2, CheckCircle, XCircle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { useOrgStore } from "@/store/org-store";
import { FeatureGate, SetupRequestGate } from "@/components/feature-gate/FeatureGate";
import { cn } from "@/lib/utils";
import type { EscalationReason } from "@/types";

// ── Types ──
interface AISettings {
  provider: "openai" | "anthropic" | "";
  apiKey: string;
  model: string;
  enabled: boolean;
  autoReply: boolean;
  systemPrompt: string;
  escalationTriggers: {
    reason: string;
    label: string;
    keywords: string[];
    enabled: boolean;
  }[];
  escalationReplyMessage: string;
  channelToggles: Record<string, boolean>;
}

const DEFAULT_SYSTEM_PROMPT = `You are a compassionate Christian ministry counselor for ReachTheSoul ministry platform.

Your role:
- Respond with empathy, grace, and biblical wisdom
- Pray with respondents when appropriate
- Share relevant scripture verses
- Detect when someone needs human counselor intervention
- Always respond in the same language the respondent uses (Indonesian/English)
- Keep responses concise but warm (2-4 paragraphs max)
- Never give medical, legal, or financial advice — refer to professionals

Important: If someone expresses suicidal thoughts, severe crisis, or needs immediate help, immediately flag for human escalation and provide words of comfort.`;

const DEFAULT_SETTINGS: AISettings = {
  provider: "",
  apiKey: "",
  model: "",
  enabled: false,
  autoReply: false,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  escalationTriggers: [
    { reason: "prayer_request", label: "Prayer Request", keywords: ["pray", "prayer", "doa", "doakan", "berdoa", "mohon doa"], enabled: true },
    { reason: "counseling", label: "Counseling / Emotional", keywords: ["depresi", "depression", "anxiety", "stress", "sedih", "putus asa", "hopeless", "lonely", "kesepian", "takut", "trauma"], enabled: true },
    { reason: "salvation_inquiry", label: "Wants to Know Jesus", keywords: ["jesus", "yesus", "salvation", "keselamatan", "percaya", "believe", "kristen", "christian", "baptis"], enabled: true },
    { reason: "grief_or_crisis", label: "Grief / Crisis", keywords: ["meninggal", "died", "death", "bunuh diri", "suicide", "crisis", "darurat", "emergency", "kecelakaan", "sakit parah"], enabled: true },
    { reason: "baptism_request", label: "Baptism Request", keywords: ["baptis", "baptism", "dibaptis", "pembaptisan"], enabled: true },
    { reason: "manual_escalation", label: "Manual Escalation", keywords: ["talk to human", "talk to human", "agent", "counselor", "counselor"], enabled: true },
  ],
  escalationReplyMessage: "Thank you for reaching out. I'm connecting you with a team member who can assist you personally. They'll be with you shortly! 🙏",
  channelToggles: {
    WhatsApp: true,
    Instagram: true,
    Facebook: true,
    Website: true,
    Call: false,
  },
};

const OPENAI_MODELS = [
  { id: "gpt-4o-mini", name: "GPT-4o Mini — Fast & cheap ($0.15/1M tokens)" },
  { id: "gpt-4o", name: "GPT-4o — Best quality ($2.50/1M tokens)" },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini — Latest mini model" },
  { id: "gpt-4.1", name: "GPT-4.1 — Latest flagship model" },
];

const ANTHROPIC_MODELS = [
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4 — Best balance ($3/1M tokens)" },
  { id: "claude-haiku-4-20250414", name: "Claude Haiku 4 — Fast & cheap ($0.25/1M tokens)" },
];

const TRIGGER_ICONS: Record<string, React.ReactNode> = {
  prayer_request: <HandHeart size={14} />,
  counseling: <HeartHandshake size={14} />,
  salvation_inquiry: <Sparkles size={14} />,
  grief_or_crisis: <AlertTriangle size={14} />,
  baptism_request: <Droplets size={14} />,
  manual_escalation: <UserCog size={14} />,
};

function AISettingsContent() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const orgId = activeOrg?.orgId ?? "";
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [emergencyContacts, setEmergencyContacts] = useState<{name: string; phone: string; role: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [expandedTrigger, setExpandedTrigger] = useState<string | null>("prayer_request");
  const [newKeyword, setNewKeyword] = useState<Record<string, string>>({});

  // Test panel
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  // Load settings from organization document
  useEffect(() => {
    if (!orgId) return;
    async function load() {
      try {
        const [{ doc, getDoc }, { db }] = await Promise.all([
          import("firebase/firestore"),
          import("@/lib/firebase"),
        ]);
        const snap = await getDoc(doc(db, "organizations", orgId));
        if (snap.exists()) {
          const data = snap.data()?.aiConfig;
          if (data) {
            setSettings({
              ...DEFAULT_SETTINGS,
              ...data,
              escalationTriggers: data.escalationTriggers?.length ? data.escalationTriggers : DEFAULT_SETTINGS.escalationTriggers,
              channelToggles: {
                ...DEFAULT_SETTINGS.channelToggles,
                ...(data.channelToggles ?? {}),
              },
            });
          }
          // Load emergency contacts
          const ec = snap.data()?.emergencyContacts;
          if (ec && Array.isArray(ec)) {
            setEmergencyContacts(ec);
          }
        }
      } catch (err) {
        console.error("Failed to load AI settings:", err);
      }
      setLoading(false);
    }
    load();
  }, [orgId]);

  // Save settings to organization document
  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const [{ doc, updateDoc, serverTimestamp }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("@/lib/firebase"),
      ]);
      await updateDoc(doc(db, "organizations", orgId), {
        aiConfig: {
          ...settings,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.uid ?? "unknown",
        },
        emergencyContacts: emergencyContacts.filter((c) => c.phone.trim()),
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Failed to save AI settings:", err);
    }
    setSaving(false);
  };

  // Test AI
  const handleTest = async () => {
    if (!testInput.trim()) return;
    setTestLoading(true);
    setTestResult(null);
    setTestError(null);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          apiKey: settings.apiKey,
          provider: settings.provider,
          model: settings.model,
          messages: [
            { role: "system", content: settings.systemPrompt },
            { role: "user", content: testInput },
          ],
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? `HTTP ${response.status}`);
      }
      const data = await response.json();
      setTestResult(data.choices?.[0]?.message?.content ?? "No response");
    } catch (err: any) {
      setTestError(err.message ?? "Test failed");
    }
    setTestLoading(false);
  };

  // Helpers
  const toggleTrigger = (reason: string) => {
    setSettings((s) => ({
      ...s,
      escalationTriggers: s.escalationTriggers.map((t) =>
        t.reason === reason ? { ...t, enabled: !t.enabled } : t
      ),
    }));
  };

  const addKeyword = (reason: string) => {
    const kw = (newKeyword[reason] ?? "").trim();
    if (!kw) return;
    setSettings((s) => ({
      ...s,
      escalationTriggers: s.escalationTriggers.map((t) =>
        t.reason === reason ? { ...t, keywords: [...t.keywords, kw] } : t
      ),
    }));
    setNewKeyword((prev) => ({ ...prev, [reason]: "" }));
  };

  const removeKeyword = (reason: string, kw: string) => {
    setSettings((s) => ({
      ...s,
      escalationTriggers: s.escalationTriggers.map((t) =>
        t.reason === reason ? { ...t, keywords: t.keywords.filter((k) => k !== kw) } : t
      ),
    }));
  };

  const toggleChannel = (channel: string) => {
    setSettings((s) => ({
      ...s,
      channelToggles: { ...s.channelToggles, [channel]: !s.channelToggles[channel] },
    }));
  };

  const models = settings.provider === "openai" ? OPENAI_MODELS : settings.provider === "anthropic" ? ANTHROPIC_MODELS : [];
  const maskedKey = settings.apiKey ? settings.apiKey.slice(0, 8) + "••••••••" + settings.apiKey.slice(-4) : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading AI settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Bot size={16} className="text-blue-600" />
            AI Integration Settings
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Configure AI provider, API key, auto-reply, and escalation triggers.</p>
        </div>
        <Button onClick={handleSave} size="sm" className="gap-1.5 h-8 text-xs" disabled={saving}>
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* ── AI Provider & API Key ── */}
      <Card className="border border-border shadow-none">
        <CardHeader className="py-3 px-4 border-b border-border">
          <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
            <Key size={12} className="text-primary" />AI Provider & API Key
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex flex-col gap-4">
          {/* Provider selector */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Provider</label>
            <Select
              value={settings.provider}
              onValueChange={(v) => setSettings((s) => ({ ...s, provider: v as any, model: "" }))}
            >
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select AI provider..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">
                  <span className="flex items-center gap-2">OpenAI (GPT-4o, GPT-4.1)</span>
                </SelectItem>
                <SelectItem value="anthropic">
                  <span className="flex items-center gap-2">Anthropic (Claude Sonnet, Haiku)</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          {settings.provider && (
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                API Key {settings.provider === "openai" ? "(from platform.openai.com)" : "(from console.anthropic.com)"}
              </label>
              <div className="relative">
                <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={settings.apiKey}
                  onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
                  placeholder={settings.provider === "openai" ? "sk-proj-..." : "sk-ant-..."}
                  className="h-9 text-sm pl-8 pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                API key is stored encrypted in Firestore. Only admins can view and modify.
              </p>
            </div>
          )}

          {/* Model selector */}
          {settings.provider && models.length > 0 && (
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Model</label>
              <Select
                value={settings.model}
                onValueChange={(v) => setSettings((s) => ({ ...s, model: v }))}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select model..." /></SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status indicator */}
          {settings.provider && settings.apiKey && settings.model && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
              <CheckCircle size={14} className="text-emerald-600" />
              <p className="text-xs text-emerald-700 font-medium">
                AI configured: {settings.provider === "openai" ? "OpenAI" : "Anthropic"} / {settings.model}
              </p>
            </div>
          )}

          {!settings.provider && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle size={14} className="text-amber-600" />
              <p className="text-xs text-amber-700">Select a provider and enter your API key to enable AI.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Master toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: "AI Enabled", desc: "Master toggle for all AI features",
            value: settings.enabled,
            onToggle: () => setSettings((s) => ({ ...s, enabled: !s.enabled })),
            color: "blue", disabled: !settings.apiKey,
          },
          {
            label: "Auto Reply", desc: "AI replies automatically without human review",
            value: settings.autoReply && settings.enabled,
            onToggle: () => setSettings((s) => ({ ...s, autoReply: !s.autoReply })),
            color: "violet", disabled: !settings.enabled,
          },
          {
            label: "Escalation Detection", desc: "Detect and flag sensitive messages",
            value: settings.escalationTriggers.some((t) => t.enabled),
            onToggle: () => {}, color: "orange", readOnly: true,
          },
        ].map((item) => (
          <Card key={item.label} className="border border-border shadow-none">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
              <button
                disabled={item.disabled || item.readOnly}
                onClick={item.onToggle}
                className={cn(
                  "relative w-10 h-5 rounded-full transition-colors flex-shrink-0",
                  item.value ? "bg-blue-600" : "bg-muted",
                  (item.disabled || item.readOnly) && "opacity-40 cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                  item.value ? "translate-x-5" : "translate-x-0.5"
                )} />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* System Prompt */}
          <Card className="border border-border shadow-none">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Zap size={12} className="text-primary" />System Prompt
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
                Main AI instructions. Determines how AI responds to all incoming messages.
              </p>
              <Textarea
                value={settings.systemPrompt}
                onChange={(e) => setSettings((s) => ({ ...s, systemPrompt: e.target.value }))}
                className="text-xs min-h-[220px] resize-none font-mono leading-relaxed"
                disabled={!settings.enabled}
              />
              <button
                onClick={() => setSettings((s) => ({ ...s, systemPrompt: DEFAULT_SYSTEM_PROMPT }))}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground mt-2 transition-colors"
              >
                <RotateCcw size={9} />Reset to default
              </button>
            </CardContent>
          </Card>

          {/* Channel toggles */}
          <Card className="border border-border shadow-none">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Shield size={12} className="text-primary" />AI Active Channels
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-2">
              <p className="text-[10px] text-muted-foreground mb-1">Select which channels AI auto-replies on.</p>
              {Object.entries(settings.channelToggles).map(([channel, active]) => (
                <div key={channel} className="flex items-center justify-between py-1.5 border-b border-border/60 last:border-0">
                  <span className="text-sm text-foreground">{channel}</span>
                  <button
                    disabled={!settings.enabled}
                    onClick={() => toggleChannel(channel)}
                    className={cn(
                      "relative w-9 h-5 rounded-full transition-colors",
                      active && settings.enabled ? "bg-blue-600" : "bg-muted",
                      !settings.enabled && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                      active && settings.enabled ? "translate-x-4" : "translate-x-0.5"
                    )} />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Escalation triggers */}
          <Card className="border border-border shadow-none">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Shield size={12} className="text-orange-600" />Escalation Triggers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {settings.escalationTriggers.map((trigger) => {
                const isExpanded = expandedTrigger === trigger.reason;
                return (
                  <div key={trigger.reason} className="border-b border-border last:border-0">
                    <div
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left cursor-pointer"
                      onClick={() => setExpandedTrigger(isExpanded ? null : trigger.reason)}
                    >
                      <span className="text-muted-foreground">{TRIGGER_ICONS[trigger.reason] ?? <Shield size={14} />}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{trigger.label}</p>
                        <p className="text-[10px] text-muted-foreground">{trigger.keywords.length} keywords</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleTrigger(trigger.reason); }}
                        className={cn(
                          "relative w-9 h-5 rounded-full transition-colors flex-shrink-0",
                          trigger.enabled ? "bg-orange-500" : "bg-muted"
                        )}
                      >
                        <span className={cn(
                          "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                          trigger.enabled ? "translate-x-4" : "translate-x-0.5"
                        )} />
                      </button>
                      {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-3 bg-muted/20">
                        <p className="text-[10px] text-muted-foreground mt-1 mb-2 font-semibold uppercase tracking-wide">Keywords — any match triggers escalation</p>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {trigger.keywords.map((kw) => (
                            <span key={kw} className="flex items-center gap-1 text-[10px] bg-background border border-border rounded-full px-2 py-0.5 text-foreground">
                              {kw}
                              <button onClick={() => removeKeyword(trigger.reason, kw)} className="text-muted-foreground hover:text-destructive"><Trash2 size={8} /></button>
                            </span>
                          ))}
                          {trigger.keywords.length === 0 && (
                            <span className="text-[10px] text-muted-foreground italic">No keywords — trigger is inactive</span>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <Input
                            value={newKeyword[trigger.reason] ?? ""}
                            onChange={(e) => setNewKeyword((p) => ({ ...p, [trigger.reason]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") addKeyword(trigger.reason); }}
                            placeholder="Add keyword..."
                            className="h-7 text-xs flex-1"
                          />
                          <Button size="sm" variant="outline" onClick={() => addKeyword(trigger.reason)} className="h-7 text-xs px-2">
                            <Plus size={10} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Escalation Reply Message */}
          <Card className="border border-border shadow-none">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                <HandHeart size={12} className="text-purple-600" />Escalation Reply Message
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-2">
              <p className="text-[10px] text-muted-foreground">This message is sent to the respondent when an escalation trigger is detected. Let them know a human is on the way.</p>
              <Textarea
                value={settings.escalationReplyMessage}
                onChange={(e) => setSettings((s) => ({ ...s, escalationReplyMessage: e.target.value }))}
                rows={3}
                className="text-xs resize-none"
                placeholder="Thank you for reaching out. I'm connecting you with a team member..."
              />
            </CardContent>
          </Card>

          {/* Emergency Contacts */}
          <Card className="border border-red-200 shadow-none">
            <CardHeader className="py-3 px-4 border-b border-red-100 bg-red-50/50">
              <CardTitle className="text-xs font-semibold text-red-800 flex items-center gap-2">
                <AlertTriangle size={12} />Emergency Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-3">
              <p className="text-[10px] text-muted-foreground">
                When an escalation trigger is detected, these people will receive an <strong>instant WhatsApp alert</strong> with the respondent's name, message, and ticket link. Add your on-call pastor, youth leader, or crisis counselor.
              </p>
              {emergencyContacts.map((contact, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={contact.name}
                    onChange={(e) => {
                      const updated = [...emergencyContacts];
                      updated[idx] = { ...updated[idx], name: e.target.value };
                      setEmergencyContacts(updated);
                    }}
                    placeholder="Name (e.g. Pastor John)"
                    className="h-8 text-xs flex-1"
                  />
                  <Input
                    value={contact.phone}
                    onChange={(e) => {
                      const updated = [...emergencyContacts];
                      updated[idx] = { ...updated[idx], phone: e.target.value };
                      setEmergencyContacts(updated);
                    }}
                    placeholder="WhatsApp number (e.g. 6281234567890)"
                    className="h-8 text-xs flex-1 font-mono"
                  />
                  <Input
                    value={contact.role}
                    onChange={(e) => {
                      const updated = [...emergencyContacts];
                      updated[idx] = { ...updated[idx], role: e.target.value };
                      setEmergencyContacts(updated);
                    }}
                    placeholder="Role (e.g. Youth Pastor)"
                    className="h-8 text-xs w-36"
                  />
                  <button
                    onClick={() => setEmergencyContacts(emergencyContacts.filter((_, i) => i !== idx))}
                    className="text-red-400 hover:text-red-600 text-xs px-1"
                  >✕</button>
                </div>
              ))}
              <button
                onClick={() => setEmergencyContacts([...emergencyContacts, { name: "", phone: "", role: "" }])}
                className="text-xs text-primary hover:text-primary/80 font-medium w-fit"
              >+ Add emergency contact</button>
            </CardContent>
          </Card>

          {/* Test Panel */}
          <Card className="border border-border shadow-none">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2">
                <TestTube2 size={12} className="text-emerald-600" />Test AI Response
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-3">
              <p className="text-[10px] text-muted-foreground">Send a test message to see how AI responds.</p>
              <Textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Example: I am going through a family crisis, can you pray for me?"
                className="text-xs min-h-[60px] resize-none"
                disabled={!settings.provider || !settings.apiKey}
              />
              <Button
                size="sm"
                onClick={handleTest}
                disabled={!testInput.trim() || testLoading || !settings.provider || !settings.apiKey}
                className="gap-1.5 text-xs h-8"
              >
                {testLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                {testLoading ? "AI is thinking..." : "Test AI"}
              </Button>

              {testError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <XCircle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{testError}</p>
                </div>
              )}

              {testResult && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Bot size={12} className="text-blue-600" />
                    <span className="text-[10px] font-semibold text-blue-700">AI Response</span>
                  </div>
                  <p className="text-xs text-blue-900 leading-relaxed whitespace-pre-wrap">{testResult}</p>
                </div>
              )}

              {(!settings.provider || !settings.apiKey) && (
                <p className="text-[10px] text-muted-foreground italic">Select a provider and enter your API key first to test.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AISettingsPage() {
  const plan = (useOrgStore((s) => s.activeOrg?.plan) ?? "free") as "free" | "starter" | "growth" | "enterprise";
  return (
    <FeatureGate feature="aiAutoReply">
      <SetupRequestGate plan={plan} selfServiceMinPlan="growth" featureLabel="AI Configuration" setupFee="$29">
        <AISettingsContent />
      </SetupRequestGate>
    </FeatureGate>
  );
}
