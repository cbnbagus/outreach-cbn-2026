"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, X, Phone, Mail, MapPin, Globe, ExternalLink, UserPlus } from "lucide-react";
import { useRespondents } from "@/hooks/use-firestore-respondents";
import { useLeadSources } from "@/hooks/use-firestore-config";
import { useTickets } from "@/hooks/use-firestore-tickets";
import type { Respondent } from "@/types";
import { cn } from "@/lib/utils";

interface RespondentSearchBoxProps {
  value: string;                        // selected respondentId
  onChange: (id: string) => void;
  excludeBlocked?: boolean;
  placeholder?: string;
  className?: string;
}

function highlight(text: string, query: string) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded-[2px] px-0">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function matchScore(r: Respondent, q: string, leadSources: any[]): number {
  if (!q) return 1;
  const lower = q.toLowerCase();
  if (r.fullName.toLowerCase().startsWith(lower)) return 4;
  if (r.phone?.includes(lower)) return 3;
  if (r.fullName.toLowerCase().includes(lower)) return 3;
  if (r.email?.toLowerCase().includes(lower)) return 2;
  if (r.city?.toLowerCase().includes(lower)) return 2;
  if (r.programSource?.toLowerCase().includes(lower)) return 1;
  if ((leadSources.find((ls: any) => (ls.id || ls.leadSourceId) === r.leadSourceId)?.name ?? "").toLowerCase().includes(lower)) return 1;
  return 0;
}

export function RespondentSearchBox({
  value,
  onChange,
  excludeBlocked = false,
  placeholder = "Search name, phone, email, city...",
  className,
}: RespondentSearchBoxProps) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState("");
  const inputRef            = useRef<HTMLInputElement>(null);
  const containerRef        = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const { respondents: allRespondents } = useRespondents();
  const { items: leadSources } = useLeadSources();
  const { tickets } = useTickets();

  const selected = allRespondents.find((r) => r.respondentId === value);

  const candidates = allRespondents
    .filter((r) => !r.isArchived && (!excludeBlocked || !r.isBlocked))
    .map((r) => ({ r, score: matchScore(r, query, leadSources) }))
    .filter(({ score }) => score > 0 || !query)
    .sort((a, b) => b.score - a.score || a.r.fullName.localeCompare(b.r.fullName))
    .map(({ r }) => r);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectRespondent = useCallback((r: Respondent) => {
    onChange(r.respondentId);
    setQuery("");
    setOpen(false);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, candidates.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); if (candidates[activeIdx]) selectRespondent(candidates[activeIdx]); }
    if (e.key === "Escape")    { setOpen(false); }
  };

  const prevTicketCount = selected
    ? tickets.filter((t) => t.respondentId === selected.respondentId).length
    : 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger / selected display */}
      {selected && !open ? (
        <div
          className="flex items-center gap-2.5 h-10 px-3 border border-border rounded-md bg-background cursor-pointer hover:border-primary/50 transition-colors group"
          onClick={() => { setOpen(true); setQuery(""); setTimeout(() => inputRef.current?.focus(), 50); }}
        >
          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
            {selected.fullName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate leading-none">{selected.fullName}</p>
            {selected.phone && (
              <p className="text-[10px] font-mono text-muted-foreground leading-none mt-0.5">{selected.phone}</p>
            )}
          </div>
          {prevTicketCount > 0 && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex-shrink-0">
              {prevTicketCount} tickets
            </span>
          )}
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 ml-1"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            autoFocus={open}
            placeholder={placeholder}
            className="w-full h-10 pl-8 pr-9 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/60"
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIdx(0); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1.5 w-full rounded-xl border border-border bg-background shadow-lg overflow-hidden">
          {/* Search input inside dropdown (when selected is shown above as chip) */}
          {selected && (
            <div className="relative border-b border-border">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                autoFocus
                value={query}
                placeholder="Search name, phone, email, city..."
                className="w-full h-9 pl-8 pr-3 text-xs bg-background focus:outline-none placeholder:text-muted-foreground/60"
                onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
                onKeyDown={handleKeyDown}
              />
            </div>
          )}

          {/* Results */}
          <div className="max-h-72 overflow-y-auto">
            {candidates.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-muted-foreground">No respondents found.</p>
                <Link
                  href="/dashboard/respondents/new"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                >
                  <UserPlus size={11} /> Buat respondent baru
                </Link>
              </div>
            ) : (
              <>
                {query && (
                  <p className="px-3 pt-2.5 pb-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">
                    {candidates.length} results for &ldquo;{query}&rdquo;
                  </p>
                )}
                {candidates.map((r, idx) => {
                  const prevTkts = tickets.filter((t) => t.respondentId === r.respondentId).length;
                  const ls       = leadSources.find((l) => l.leadSourceId === r.leadSourceId);
                  const isActive = idx === activeIdx;
                  const isSelected = r.respondentId === value;
                  return (
                    <button
                      key={r.respondentId}
                      className={cn(
                        "w-full text-left flex items-center gap-3 px-3 py-2.5 transition-colors",
                        isActive   && "bg-primary/8",
                        isSelected && "bg-primary/5",
                        !isActive  && "hover:bg-muted/60"
                      )}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => selectRespondent(r)}
                    >
                      {/* Avatar */}
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                        r.isBlocked ? "bg-red-100 text-red-500" : "bg-primary/10 text-primary"
                      )}>
                        {r.fullName.charAt(0)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-foreground">
                            {highlight(r.fullName, query)}
                          </span>
                          {r.isBlocked && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">Blocked</span>
                          )}
                          {ls && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                              {ls.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {r.phone && (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                              <Phone size={8} />
                              {highlight(r.phone, query)}
                            </span>
                          )}
                          {r.email && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate max-w-[160px]">
                              <Mail size={8} />
                              {highlight(r.email, query)}
                            </span>
                          )}
                          {r.city && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <MapPin size={8} />
                              {highlight(r.city, query)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right meta */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {prevTkts > 0 && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/8 text-primary">
                            {prevTkts} tickets
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[9px] text-emerald-600 font-semibold">Dipilih</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-3 py-2 flex items-center justify-between">
            <p className="text-[9px] text-muted-foreground">
              {candidates.length} respondents &bull; type to filter
            </p>
            <Link
              href="/dashboard/respondents/new"
              className="flex items-center gap-1 text-[10px] text-primary hover:underline font-medium"
              onClick={() => setOpen(false)}
            >
              <UserPlus size={10} /> Buat Baru
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
