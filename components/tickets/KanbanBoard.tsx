"use client";
import { useState } from "react";
import Link from "next/link";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/tickets/TicketStatusBadge";
import { cn } from "@/lib/utils";
import type { Ticket, TicketStatus } from "@/types";

const COLUMNS: { status: TicketStatus; label: string; color: string; bg: string }[] = [
  { status: "open",        label: "Open",        color: "text-blue-600",    bg: "bg-blue-50 border-blue-200"    },
  { status: "in_progress", label: "In Progress",  color: "text-amber-600",   bg: "bg-amber-50 border-amber-200"  },
  { status: "resolved",    label: "Resolved",     color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  { status: "closed",      label: "Closed",       color: "text-slate-500",   bg: "bg-slate-50 border-slate-200"  },
];

interface KanbanBoardProps {
  tickets: Ticket[];
  onStatusChange: (ticketId: string, newStatus: TicketStatus) => void;
}

export function KanbanBoard({ tickets, onStatusChange }: KanbanBoardProps) {
  const [draggingId, setDraggingId]   = useState<string | null>(null);
  const [overColumn,  setOverColumn]  = useState<TicketStatus | null>(null);

  const byStatus = (status: TicketStatus) => tickets.filter((t) => t.status === status);

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    setDraggingId(ticketId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: TicketStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverColumn(status);
  };

  const handleDrop = (e: React.DragEvent, status: TicketStatus) => {
    e.preventDefault();
    if (draggingId) onStatusChange(draggingId, status);
    setDraggingId(null);
    setOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setOverColumn(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-220px)]">
      {COLUMNS.map((col) => {
        const colTickets  = byStatus(col.status);
        const isOver      = overColumn === col.status;

        return (
          <div
            key={col.status}
            className={cn(
              "flex flex-col w-72 shrink-0 rounded-xl border bg-muted/30 transition-colors",
              isOver ? "border-primary/40 bg-primary/5" : "border-border"
            )}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-semibold", col.color)}>{col.label}</span>
                <span className={cn("inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold border", col.bg, col.color)}>
                  {colTickets.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2.5 p-3 flex-1">
              {colTickets.length === 0 && (
                <div className={cn(
                  "flex-1 flex items-center justify-center rounded-lg border-2 border-dashed min-h-[80px] transition-colors",
                  isOver ? "border-primary/40 bg-primary/5" : "border-border/50"
                )}>
                  <p className="text-xs text-muted-foreground">Drop here</p>
                </div>
              )}
              {colTickets.map((ticket) => {
                const isDragging = draggingId === ticket.ticketId;
                return (
                  <div
                    key={ticket.ticketId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, ticket.ticketId)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "bg-card border border-border rounded-lg p-3.5 cursor-grab active:cursor-grabbing",
                      "hover:border-primary/30 hover:shadow-sm transition-all select-none",
                      isDragging && "opacity-40 scale-95"
                    )}
                  >
                    {/* Ticket number + priority */}
                    <div className="flex items-center justify-between mb-2">
                      <Link
                        href={`/dashboard/tickets/${ticket.ticketId}`}
                        className="font-mono text-[10px] font-semibold text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ticket.ticketNumber}
                      </Link>
                      <TicketPriorityBadge priority={ticket.priority} />
                    </div>

                    {/* Subject */}
                    <p className="text-xs font-medium text-foreground leading-snug line-clamp-2 mb-3">
                      {ticket.subject}
                    </p>

                    {/* Respondent + agent */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
                          {ticket.respondentName?.charAt(0) ?? "?"}
                        </div>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                          {ticket.respondentName ?? "Unknown"}
                        </span>
                      </div>
                      {ticket.assignedAgentName && (
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0"
                          title={ticket.assignedAgentName}>
                          {ticket.assignedAgentName.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    <p className="text-[9px] text-muted-foreground/60 mt-2 border-t border-border pt-2">
                      {new Date(ticket.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
