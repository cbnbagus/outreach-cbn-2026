"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Ticket, Users, MessageCircle, X, ArrowRight, Clock } from "lucide-react";
import { useTickets } from "@/hooks/use-firestore-tickets";
import { useRespondents } from "@/hooks/use-firestore-respondents";
import { TicketStatusBadge } from "@/components/tickets/TicketStatusBadge";
import { cn } from "@/lib/utils";

type ResultType = "ticket" | "respondent" | "comment";

interface SearchResult {
  id:       string;
  type:     ResultType;
  title:    string;
  subtitle: string;
  href:     string;
  meta?:    string;
}

function searchData(q: string, tickets: any[], respondents: any[]): SearchResult[] {
  if (!q.trim()) return [];
  const lq = q.toLowerCase();
  const results: SearchResult[] = [];

  tickets.forEach((t: any) => {
    if (
      (t.ticketNumber ?? "").toLowerCase().includes(lq) ||
      (t.subject ?? "").toLowerCase().includes(lq) ||
      (t.respondentName ?? "").toLowerCase().includes(lq)
    ) {
      results.push({
        id:       t.ticketId,
        type:     "ticket",
        title:    t.subject,
        subtitle: `${t.ticketNumber} · ${t.respondentName ?? "—"}`,
        href:     `/dashboard/tickets/${t.ticketId}`,
        meta:     t.status,
      });
    }
  });

  respondents.forEach((r: any) => {
    if (
      r.fullName.toLowerCase().includes(lq) ||
      (r.phone ?? "").includes(lq) ||
      (r.email ?? "").toLowerCase().includes(lq)
    ) {
      results.push({
        id:       r.respondentId,
        type:     "respondent",
        title:    r.fullName,
        subtitle: [r.phone, r.email].filter(Boolean).join(" · "),
        href:     `/dashboard/respondents/${r.respondentId}`,
        meta:     r.leadSourceName,
      });
    }
  });

  return results.slice(0, 12);
}

const typeIcon: Record<ResultType, React.ElementType> = {
  ticket:     Ticket,
  respondent: Users,
  comment:    MessageCircle,
};

const typeLabel: Record<ResultType, string> = {
  ticket:     "Ticket",
  respondent: "Respondent",
  comment:    "Comment",
};

const typeColor: Record<ResultType, string> = {
  ticket:     "bg-blue-50 text-blue-600 border-blue-100",
  respondent: "bg-emerald-50 text-emerald-600 border-emerald-100",
  comment:    "bg-violet-50 text-violet-600 border-violet-100",
};

const RECENT_KEY = "oms_recent_searches";
function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}
function saveRecent(q: string) {
  try {
    const prev = getRecent().filter((r) => r !== q);
    localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, 5)));
  } catch { /* noop */ }
}

interface GlobalSearchProps {
  open:    boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const router    = useRouter();
  const inputRef  = useRef<HTMLInputElement>(null);
  const { tickets } = useTickets();
  const { respondents } = useRespondents();
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [cursor,  setCursor]  = useState(0);
  const [recent,  setRecent]  = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setCursor(0);
      setRecent(getRecent());
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  useEffect(() => {
    setResults(searchData(query, tickets, respondents));
    setCursor(0);
  }, [query, tickets, respondents]);

  const navigate = useCallback((href: string, q: string) => {
    if (q.trim()) saveRecent(q.trim());
    onClose();
    router.push(href);
  }, [router, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && results[cursor]) navigate(results[cursor].href, query);
    if (e.key === "Escape") onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-background rounded-xl border border-border shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={16} className="text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tickets, respondents, comments..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="p-0.5 rounded hover:bg-muted transition-colors">
              <X size={13} className="text-muted-foreground" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 border border-border">
            Esc
          </kbd>
        </div>

        {/* Results or recent */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!query && recent.length > 0 && (
            <div className="p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-2 flex items-center gap-1.5">
                <Clock size={9} />Recent searches
              </p>
              <div className="flex flex-col gap-0.5">
                {recent.map((r) => (
                  <button
                    key={r}
                    onClick={() => setQuery(r)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                  >
                    <Search size={11} />
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && results.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-4">
              <p className="text-sm font-medium text-foreground">No results for "{query}"</p>
              <p className="text-xs text-muted-foreground">Try searching by ticket number, name, or keywords.</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="p-2 flex flex-col gap-0.5">
              {results.map((r, i) => {
                const Icon = typeIcon[r.type];
                return (
                  <button
                    key={r.id}
                    onClick={() => navigate(r.href, query)}
                    onMouseEnter={() => setCursor(i)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                      cursor === i ? "bg-muted" : "hover:bg-muted/60"
                    )}
                  >
                    {/* Type badge */}
                    <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0", typeColor[r.type])}>
                      <Icon size={14} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate leading-snug">{r.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{r.subtitle}</p>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {r.type === "ticket" && r.meta && (
                        <TicketStatusBadge status={r.meta as any} />
                      )}
                      {r.type !== "ticket" && r.meta && (
                        <span className="text-[10px] text-muted-foreground capitalize">{r.meta}</span>
                      )}
                      <ArrowRight size={12} className={cn("text-muted-foreground transition-opacity", cursor === i ? "opacity-100" : "opacity-0")} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border bg-muted/30">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1"><kbd className="bg-background border border-border rounded px-1">↑↓</kbd>navigate</span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1"><kbd className="bg-background border border-border rounded px-1">↵</kbd>open</span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1"><kbd className="bg-background border border-border rounded px-1">Esc</kbd>close</span>
          {results.length > 0 && (
            <span className="ml-auto text-[10px] text-muted-foreground">{results.length} result{results.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>
    </div>
  );
}
