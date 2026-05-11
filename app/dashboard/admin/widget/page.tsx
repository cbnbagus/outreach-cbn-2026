"use client";
import { useState } from "react";
import { useOrgStore } from "@/store/org-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Check, Code, Eye, MessageSquare, Palette } from "lucide-react";

export default function WidgetSetupPage() {
  const activeOrg = useOrgStore((s) => s.activeOrg);
  const orgId = activeOrg?.orgId ?? "";

  const [color, setColor] = useState(activeOrg?.primaryColor ?? "#2563EB");
  const [title, setTitle] = useState("Chat with us");
  const [subtitle, setSubtitle] = useState("We usually reply within minutes");
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(false);

  const embedCode = `<script src="https://reachthesoul.org/widget.js" data-org="${orgId}" data-color="${color}" data-title="${title}" data-subtitle="${subtitle}"></script>`;

  const copyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h2 className="text-base font-semibold text-foreground">Website Chat Widget</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add a chat widget to your website. Visitors can send messages directly to your ReachTheSoul dashboard.
        </p>
      </div>

      {/* Preview */}
      <Card className="shadow-none border-2 border-primary/20">
        <CardHeader className="py-3 px-5 border-b border-border">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <Eye size={14} className="text-primary" /> Live Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="bg-gray-50 rounded-xl p-6 relative min-h-[320px] flex items-end justify-end">
            {/* Simulated widget */}
            {preview ? (
              <div className="w-[320px] bg-white rounded-2xl shadow-xl overflow-hidden border">
                <div className="p-4" style={{ background: color }}>
                  <h3 className="text-sm font-semibold text-white">{title}</h3>
                  <p className="text-[10px] text-white/70">{subtitle}</p>
                </div>
                <div className="p-4 space-y-2 min-h-[140px]">
                  <div className="bg-gray-100 rounded-xl px-3 py-2 text-xs text-gray-600 max-w-[80%]">
                    Hi there! 👋 How can we help you today?
                  </div>
                  <div className="rounded-xl px-3 py-2 text-xs text-white max-w-[80%] ml-auto" style={{ background: color }}>
                    I need prayer for my family
                  </div>
                </div>
                <div className="flex gap-2 p-3 border-t">
                  <input className="flex-1 border rounded-lg px-3 py-1.5 text-xs" placeholder="Type a message..." disabled />
                  <button className="px-3 py-1.5 rounded-lg text-xs text-white font-semibold" style={{ background: color }}>Send</button>
                </div>
                <div className="text-center py-1.5 border-t text-[9px] text-gray-400">
                  Powered by <span className="font-semibold text-gray-500">ReachTheSoul</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setPreview(true)}
                className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform"
                style={{ background: color }}
              >
                <MessageSquare size={24} />
              </button>
            )}
            {preview && (
              <button onClick={() => setPreview(false)} className="absolute top-3 right-3 text-xs text-gray-400 hover:text-gray-600">
                Close preview
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customization */}
      <Card className="shadow-none">
        <CardHeader className="py-3 px-5 border-b border-border">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <Palette size={14} className="text-purple-500" /> Customize Widget
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Widget Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Subtitle</label>
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Brand Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-8 rounded border cursor-pointer" />
              <Input value={color} onChange={(e) => setColor(e.target.value)} className="h-8 text-xs font-mono w-28" />
              <div className="flex gap-1.5">
                {["#2563EB", "#7C3AED", "#059669", "#DC2626", "#D97706", "#0F1B2D"].map((c) => (
                  <button key={c} onClick={() => setColor(c)} className="w-6 h-6 rounded-full border-2 transition-all" style={{ background: c, borderColor: color === c ? c : "transparent" }} />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embed Code */}
      <Card className="shadow-none border-2 border-green-200">
        <CardHeader className="py-3 px-5 border-b border-border bg-green-50">
          <CardTitle className="text-xs font-semibold flex items-center gap-2 text-green-800">
            <Code size={14} /> Embed Code
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-3">
            Copy this code and paste it before the <code className="bg-muted px-1 rounded text-[11px]">&lt;/body&gt;</code> tag of your website.
          </p>
          <div className="relative">
            <pre className="bg-gray-900 text-green-400 text-[11px] p-4 rounded-lg overflow-x-auto font-mono leading-relaxed">
              {embedCode}
            </pre>
            <Button
              size="sm"
              variant={copied ? "default" : "outline"}
              className="absolute top-2 right-2 h-7 text-[10px]"
              onClick={copyCode}
            >
              {copied ? <><Check size={12} className="mr-1" /> Copied!</> : <><Copy size={12} className="mr-1" /> Copy</>}
            </Button>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-[11px] text-blue-800 font-medium mb-1">How it works:</p>
            <ul className="text-[10px] text-blue-700 space-y-1">
              <li>• Visitor opens chat widget on your website</li>
              <li>• Their message is sent to your ReachTheSoul dashboard as a new ticket</li>
              <li>• If AI is enabled, it auto-replies immediately</li>
              <li>• Your counseling team can take over at any time</li>
              <li>• All conversations are stored and tracked</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
