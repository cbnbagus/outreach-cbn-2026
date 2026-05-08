"use client";
import { useState, useMemo } from "react";
import type { SocialComment, SocialChannel, CommentStatus } from "@/types";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Youtube, Facebook, Instagram, Search, ExternalLink,
  ThumbsUp, MessageSquare, RefreshCw, Ticket, ChevronRight,
  X, Send, EyeOff, Clock,
} from "lucide-react";

// ─── Channel config ─────────────────────────────────────────────────────────
const CHANNELS: { key: SocialChannel | "all"; label: string; icon?: React.ElementType; color: string; bg: string }[] = [
  { key: "all",       label: "Semua",     color: "text-foreground",    bg: "bg-muted" },
  { key: "youtube",   label: "YouTube",   icon: Youtube,    color: "text-red-600",   bg: "bg-red-50" },
  { key: "facebook",  label: "Facebook",  icon: Facebook,   color: "text-blue-600",  bg: "bg-blue-50" },
  { key: "instagram", label: "Instagram", icon: Instagram,  color: "text-pink-600",  bg: "bg-pink-50" },
];

const STATUS_CONFIG: Record<CommentStatus, { label: string; color: string }> = {
  new:       { label: "Baru",      color: "bg-sky-100 text-sky-700" },
  replied:   { label: "Dibalas",   color: "bg-emerald-100 text-emerald-700" },
  converted: { label: "Jadi Tiket", color: "bg-violet-100 text-violet-700" },
  ignored:   { label: "Diabaikan", color: "bg-muted text-muted-foreground" },
};

function ChannelIcon({ channel, size = 13 }: { channel: SocialChannel; size?: number }) {
  if (channel === "youtube")   return <Youtube   size={size} className="text-red-500 flex-shrink-0" />;
  if (channel === "facebook")  return <Facebook  size={size} className="text-blue-500 flex-shrink-0" />;
  if (channel === "instagram") return <Instagram size={size} className="text-pink-500 flex-shrink-0" />;
  return null;
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return `${Math.floor(diff)}d yang lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m yang lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j yang lalu`;
  return `${Math.floor(diff / 86400)}h yang lalu`;
}

// ─── Comment List Item ───────────────────────────────────────────────────────
function CommentItem({
  comment, selected, onClick,
}: { comment: SocialComment; selected: boolean; onClick: () => void }) {
  const status = STATUS_CONFIG[comment.status];
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3.5 border-b border-border transition-colors flex flex-col gap-1.5",
        selected ? "bg-accent" : "hover:bg-muted/40",
        comment.status === "new" && !selected && "border-l-2 border-l-sky-400"
      )}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <ChannelIcon channel={comment.channel} size={12} />
          <span className="text-xs font-semibold truncate">{comment.authorName}</span>
          <span className="text-[10px] text-muted-foreground truncate">{comment.authorHandle}</span>
        </div>
        <span className="text-[10px] text-muted-foreground flex-shrink-0 flex items-center gap-1">
          <Clock size={9} />
          {timeAgo(comment.createdAt)}
        </span>
      </div>

      {/* Content */}
      <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2">{comment.content}</p>

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground truncate">{comment.postTitle}</span>
        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0", status.color)}>
          {status.label}
        </span>
      </div>
    </button>
  );
}

// ─── Detail Panel ────────────────────────────────────────────────────────────
function DetailPanel({
  comment, onClose, onStatusChange,
}: { comment: SocialComment; onClose: () => void; onStatusChange: (id: string, s: CommentStatus) => void }) {
  const [reply, setReply] = useState("");
  const [sent, setSent] = useState(false);
  const status = STATUS_CONFIG[comment.status];

  const handleSend = () => {
    if (!reply.trim()) return;
    setSent(true);
    setReply("");
    onStatusChange(comment.commentId, "replied");
    setTimeout(() => setSent(false), 3000);
  };

  const handleConvert = () => {
    onStatusChange(comment.commentId, "converted");
  };

  const handleIgnore = () => {
    onStatusChange(comment.commentId, "ignored");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <ChannelIcon channel={comment.channel} size={15} />
          <span className="text-sm font-semibold">{comment.authorName}</span>
          <span className="text-xs text-muted-foreground">{comment.authorHandle}</span>
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", status.color)}>
            {status.label}
          </span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-5 p-5">
        {/* Post context */}
        <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-muted/40 border border-border">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <ChannelIcon channel={comment.channel} size={10} />
            <span className="uppercase font-semibold tracking-wide">
              {comment.channel === "youtube" ? "YouTube Video" : comment.channel === "facebook" ? "Facebook Post" : "Instagram Post"}
            </span>
          </div>
          <p className="text-xs font-medium text-foreground">{comment.postTitle}</p>
          <a
            href={comment.postUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-primary flex items-center gap-1 hover:underline"
          >
            Buka postingan <ExternalLink size={9} />
          </a>
        </div>

        {/* Comment content */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Komentar</p>
          <p className="text-sm leading-relaxed text-foreground">{comment.content}</p>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><ThumbsUp size={10} />{comment.likeCount} suka</span>
            <span className="flex items-center gap-1"><MessageSquare size={10} />{comment.replyCount} balasan</span>
            <span className="flex items-center gap-1"><Clock size={10} />{new Date(comment.createdAt).toLocaleString("id-ID")}</span>
          </div>
        </div>

        {/* Actions */}
        {comment.status !== "converted" && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Aksi</p>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 h-7"
                onClick={handleConvert}
                disabled={(comment.status as string) === "converted"}
              >
                <Ticket size={11} />
                Buat Tiket
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 h-7 text-muted-foreground"
                onClick={handleIgnore}
                disabled={comment.status === "ignored"}
              >
                <EyeOff size={11} />
                Abaikan
              </Button>
            </div>
            {(comment.status as string) === "converted" && comment.convertedTicketId && (
              <p className="text-xs text-violet-600 flex items-center gap-1">
                <Ticket size={11} />
                Tiket #{comment.convertedTicketId} sudah dibuat
              </p>
            )}
          </div>
        )}

        {/* Converted note */}
        {comment.status === "converted" && (
          <div className="p-3 rounded-lg bg-violet-50 border border-violet-200 text-xs text-violet-700 flex items-center gap-2">
            <Ticket size={13} />
            Komentar ini sudah dikonversi menjadi tiket.
          </div>
        )}

        {/* Sent confirmation */}
        {sent && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
            <Send size={11} />
            Balasan dikirim. Status diperbarui ke "Dibalas".
          </div>
        )}
      </div>

      {/* Reply box */}
      {comment.status !== "ignored" && (
        <div className="border-t border-border p-4 flex flex-col gap-2 flex-shrink-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Balas Komentar</p>
          <textarea
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={`Tulis balasan ke ${comment.authorName}...`}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              Balasan akan tercatat di sistem. Kirim manual melalui platform aslinya.
            </p>
            <Button size="sm" className="h-7 text-xs gap-1.5" onClick={handleSend} disabled={!reply.trim()}>
              <Send size={11} />
              Kirim
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
import { FeatureGate } from "@/components/feature-gate/FeatureGate";

function SocialInboxContent() {
  const [channelFilter, setChannelFilter] = useState<SocialChannel | "all">("all");
  const [statusFilter, setStatusFilter]   = useState<CommentStatus | "all">("all");
  const [search, setSearch]               = useState("");
  const [selected, setSelected]           = useState<string | null>(null);
  const [comments, setComments]           = useState<SocialComment[]>([]); // Will be populated when social media APIs are connected
  const [lastRefresh, setLastRefresh]     = useState(new Date());
  const [refreshing, setRefreshing]       = useState(false);

  const handleStatusChange = (id: string, status: CommentStatus) => {
    setComments((prev) => prev.map((c) => c.commentId === id ? { ...c, status } : c));
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => { setLastRefresh(new Date()); setRefreshing(false); }, 1200);
  };

  const filtered = useMemo(() => {
    return comments.filter((c) => {
      if (channelFilter !== "all" && c.channel !== channelFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!c.authorName.toLowerCase().includes(q) &&
            !c.content.toLowerCase().includes(q) &&
            !c.postTitle.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [comments, channelFilter, statusFilter, search]);

  const selectedComment = comments.find((c) => c.commentId === selected) ?? null;

  const counts = useMemo(() => ({
    all:       comments.length,
    youtube:   comments.filter((c) => c.channel === "youtube").length,
    facebook:  comments.filter((c) => c.channel === "facebook").length,
    instagram: comments.filter((c) => c.channel === "instagram").length,
    new:       comments.filter((c) => c.status === "new").length,
  }), [comments]);

  return (
    <div className="flex flex-col gap-0 h-[calc(100vh-56px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background flex-shrink-0">
        <div>
          <h1 className="text-sm font-semibold">Social Inbox</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Komentar masuk dari YouTube, Facebook, dan Instagram.
            {counts.new > 0 && (
              <span className="ml-1 font-medium text-sky-600">{counts.new} komentar baru</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            Diperbarui {lastRefresh.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={11} className={cn(refreshing && "animate-spin")} />
            {refreshing ? "Memuat..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left panel — list */}
        <div className={cn(
          "flex flex-col border-r border-border bg-background flex-shrink-0 transition-all",
          selectedComment ? "w-80" : "flex-1 max-w-xl"
        )}>
          {/* Filters */}
          <div className="flex flex-col gap-2 px-4 py-3 border-b border-border flex-shrink-0">
            {/* Channel tabs */}
            <div className="flex gap-1 flex-wrap">
              {CHANNELS.map((ch) => {
                const Icon = ch.icon;
                const count = counts[ch.key as keyof typeof counts];
                return (
                  <button
                    key={ch.key}
                    onClick={() => setChannelFilter(ch.key as SocialChannel | "all")}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border",
                      channelFilter === ch.key
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {Icon && <Icon size={11} />}
                    {ch.label}
                    {count !== undefined && (
                      <span className={cn(
                        "text-[10px] px-1 rounded-full",
                        channelFilter === ch.key ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Status + Search row */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari komentar..."
                  className="h-7 pl-7 text-xs"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as CommentStatus | "all")}
                className="h-7 text-xs border border-border rounded-md px-2 bg-background text-foreground focus:outline-none"
              >
                <option value="all">Semua status</option>
                <option value="new">Baru</option>
                <option value="replied">Dibalas</option>
                <option value="converted">Jadi Tiket</option>
                <option value="ignored">Diabaikan</option>
              </select>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground py-16">
                <MessageSquare size={28} className="opacity-20" />
                <p className="text-xs">Tidak ada komentar ditemukan</p>
              </div>
            ) : (
              filtered.map((c) => (
                <CommentItem
                  key={c.commentId}
                  comment={c}
                  selected={selected === c.commentId}
                  onClick={() => setSelected(c.commentId === selected ? null : c.commentId)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right panel — detail */}
        {selectedComment ? (
          <div className="flex-1 min-w-0 overflow-hidden">
            <DetailPanel
              comment={selectedComment}
              onClose={() => setSelected(null)}
              onStatusChange={handleStatusChange}
            />
          </div>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center gap-3 text-muted-foreground bg-muted/20">
            <MessageSquare size={32} className="opacity-15" />
            <p className="text-xs">Pilih komentar untuk melihat detail</p>
            <div className="flex gap-3 mt-2">
              {(["youtube", "facebook", "instagram"] as SocialChannel[]).map((ch) => (
                <div key={ch} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <ChannelIcon channel={ch} size={12} />
                  <span className="capitalize">{ch}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SocialInboxPage() {
  return (
    <FeatureGate feature="socialInbox">
      <SocialInboxContent />
    </FeatureGate>
  );
}
