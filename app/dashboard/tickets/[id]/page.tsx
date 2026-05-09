"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronLeft, Send, Lock, Unlock, AlertTriangle, Phone, Mail,
  Globe, Tag, CheckCircle2, ChevronDown, User, Zap, X, Printer,
  Bot, UserCheck, Sparkles, HandHeart, HeartHandshake, Droplets,
  ShieldAlert, UserCog, RefreshCw, StickyNote, Plus, Trash2,
} from "lucide-react";
import { usePrint } from "@/hooks/use-print";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketStatusBadge, TicketPriorityBadge } from "@/components/tickets/TicketStatusBadge";
import { useCategories, useOutcomes, useUsers } from "@/hooks/use-firestore-config";
import { useMessages } from "@/hooks/use-firestore-tickets";
import { useRespondent } from "@/hooks/use-firestore-respondents";
import { fetchTicketById, updateTicketStatus, updateTicketClassification, sendMessage } from "@/lib/firestore-services";
import { useAuthStore } from "@/store/auth-store";
import { usePresenceStore } from "@/store/presence-store";
import { generateAIReply, sleep, detectEscalation, ESCALATION_COLORS, ESCALATION_LABELS } from "@/lib/ai-engine";
import { cn } from "@/lib/utils";
import type { TicketStatus, Message, EscalationTrigger, HandledBy, EscalationReason, Ticket } from "@/types";

const statusFlow: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];

const quickReplies = [
  { id: "qr1", label: "Prayer confirmation",  text: "We have received your prayer request and are lifting you up in prayer right now. May God's peace that surpasses all understanding guard your heart and mind." },
  { id: "qr2", label: "Welcome new believer", text: "Welcome to the family of God! Your decision to follow Christ is the most important decision you will ever make. We are here to walk alongside you every step of the way." },
  { id: "qr3", label: "Scripture — Isaiah 41:10", text: "Here is a verse for you — Isaiah 41:10: 'Do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.'" },
  { id: "qr4", label: "Follow-up scheduled",  text: "Thank you for sharing with us. I would love to follow up with you again in a few days. Please feel free to reach out anytime — we are here for you." },
  { id: "qr5", label: "Referral to pastor",   text: "Thank you for trusting us with this. Given the nature of your situation, I would like to connect you with one of our pastors who can provide deeper support. Someone will reach out to you shortly." },
  { id: "qr6", label: "Baptism info",          text: "Baptism is a wonderful step of obedience and public declaration of your faith in Christ. Our next baptism service is coming up soon — I will send you the details and registration information." },
];

const ESCALATION_ICON_MAP: Record<EscalationReason, React.ReactNode> = {
  prayer_request:    <HandHeart size={13} />,
  counseling:        <HeartHandshake size={13} />,
  salvation_inquiry: <Sparkles size={13} />,
  grief_or_crisis:   <AlertTriangle size={13} />,
  baptism_request:   <Droplets size={13} />,
  manual_escalation: <UserCog size={13} />,
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function groupByDate(msgs: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  msgs.forEach((msg) => {
    const date = formatDate(msg.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.messages.push(msg);
    else groups.push({ date, messages: [msg] });
  });
  return groups;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.currentUser);

  // Firestore data
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [ticketLoading, setTicketLoading] = useState(true);
  const { items: categories } = useCategories();
  const { items: outcomes } = useOutcomes();
  const { messages: firestoreMessages, loading: msgsLoading } = useMessages(id);
  const { respondent } = useRespondent(ticket?.respondentId ?? null);

  // Load ticket once + mark as read
  useEffect(() => {
    fetchTicketById(id).then(async (t: any) => {
      if (t) {
        // Convert Firestore timestamps
        setTicket({
          ...t,
          createdAt: t.createdAt?.toDate?.()?.toISOString?.() ?? t.createdAt ?? "",
          updatedAt: t.updatedAt?.toDate?.()?.toISOString?.() ?? t.updatedAt ?? "",
        } as Ticket);
        // Mark as read — clear hasUnread flag
        if (t.hasUnread) {
          try {
            const [{ doc, updateDoc }, { getFirestore }, { getFirebaseApp }] = await Promise.all([
              import("firebase/firestore"),
              import("firebase/firestore"),
              import("@/lib/firebase"),
            ]);
            const db = getFirestore(getFirebaseApp());
            await updateDoc(doc(db, "tickets", id), { hasUnread: false });
          } catch (err) {
            console.error("Failed to mark ticket as read:", err);
          }
        }
      }
      setTicketLoading(false);
    });
  }, [id]);

  const [messages, setMessages]         = useState<Message[]>([]);
  // Sync Firestore messages — filter out Fonnte echo messages
  useEffect(() => {
    if (firestoreMessages.length > 0) {
      const filtered = firestoreMessages.filter((m: any) => {
        const content = (m.content ?? "").toString();
        // Skip Fonnte echo messages
        if (content.includes("_Sent via fonnte.com_") || content.includes("Sent via fonnte")) return false;
        return true;
      });
      setMessages(filtered);
    }
  }, [firestoreMessages]);

  const [reply, setReply]               = useState("");
  const [isInternal, setIsInternal]     = useState(false);
  const [categoryId, setCategoryId]     = useState("");
  const [outcomeId, setOutcomeId]       = useState("");
  const [status, setStatus]             = useState<TicketStatus>("open");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);

  // Init state from ticket once loaded
  useEffect(() => {
    if (ticket) {
      setCategoryId(ticket.categoryId ?? "");
      setOutcomeId(ticket.interactionOutcomeId ?? "");
      setStatus(ticket.status);
    }
  }, [ticket]);

  // AI state
  const [handledBy, setHandledBy]       = useState<HandledBy>("human");
  const [escalation, setEscalation]     = useState<EscalationTrigger | null>(null);
  const [aiTyping, setAiTyping]         = useState(false);
  const [aiEnabled]                     = useState(false); // TODO: load from system config
  const [simulateInput, setSimulateInput] = useState("");
  const [showSimulate, setShowSimulate] = useState(false);
  const [aiError, setAiError]           = useState<string | null>(null);

  // Agent notes (pinned, visible to all agents, separate from reply thread)
  const [agentNotes, setAgentNotes]     = useState<{ id: string; text: string; author: string; authorId: string; createdAt: string }[]>([]);
  const [newNote, setNewNote]           = useState("");
  const [notesLoaded, setNotesLoaded]   = useState(false);

  // Load notes from Firestore on mount
  useEffect(() => {
    if (!ticket || notesLoaded) return;
    const loadNotes = async () => {
      try {
        const [{ doc, getDoc }, { db }] = await Promise.all([
          import("firebase/firestore"), import("@/lib/firebase"),
        ]);
        const snap = await getDoc(doc(db, "tickets", ticket.ticketId));
        if (snap.exists()) {
          const data = snap.data();
          if (data.counselingNotes && Array.isArray(data.counselingNotes)) {
            setAgentNotes(data.counselingNotes);
          }
        }
        setNotesLoaded(true);
      } catch (err) {
        console.error("Failed to load notes:", err);
        setNotesLoaded(true);
      }
    };
    loadNotes();
  }, [ticket, notesLoaded]);

  // Presence — current agent status
  const { presence, initialized } = usePresenceStore();
  const CURRENT_AGENT_UID = currentUser?.uid ?? "";
  const myStatus = initialized ? (presence[CURRENT_AGENT_UID]?.status ?? "online") : "online";
  const isAway   = myStatus === "away";

  // Problem categories on this ticket (editable, separate from respondent profile)
  const [problemCategories, setProblemCategories] = useState<string[]>(respondent?.problemCategories ?? []);
  const [newCategoryInput, setNewCategoryInput]   = useState("");

  const addProblemCategory = () => {
    const val = newCategoryInput.trim();
    if (!val || problemCategories.includes(val)) return;
    setProblemCategories((prev) => [...prev, val]);
    setNewCategoryInput("");
  };
  const removeProblemCategory = (cat: string) => {
    setProblemCategories((prev) => prev.filter((c) => c !== cat));
  };

  const addNote = async () => {
    const text = newNote.trim();
    if (!text || !ticket) return;
    const noteEntry = {
      id: `note_${Date.now()}`,
      text,
      author: currentUser?.displayName ?? "Agent",
      authorId: currentUser?.uid ?? "",
      createdAt: new Date().toISOString(),
    };
    // Update local state immediately
    setAgentNotes((prev) => [...prev, noteEntry]);
    setNewNote("");
    // Persist to Firestore
    try {
      const [{ doc, updateDoc, arrayUnion, serverTimestamp }, { db }] = await Promise.all([
        import("firebase/firestore"), import("@/lib/firebase"),
      ]);
      await updateDoc(doc(db, "tickets", ticket.ticketId), {
        counselingNotes: arrayUnion(noteEntry),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to save note:", err);
    }
  };

  const removeNote = async (noteId: string) => {
    const noteToRemove = agentNotes.find((n) => n.id === noteId);
    if (!noteToRemove || !ticket) return;
    setAgentNotes((prev) => prev.filter((x) => x.id !== noteId));
    try {
      const [{ doc, updateDoc, arrayRemove, serverTimestamp }, { db }] = await Promise.all([
        import("firebase/firestore"), import("@/lib/firebase"),
      ]);
      await updateDoc(doc(db, "tickets", ticket.ticketId), {
        counselingNotes: arrayRemove(noteToRemove),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to remove note:", err);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const { print }      = usePrint();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiTyping]);

  const canClose = categoryId !== "" && outcomeId !== "";

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if ((newStatus === "resolved" || newStatus === "closed") && !canClose) return;
    setStatus(newStatus);
    if (ticket) {
      try {
        await updateTicketStatus(ticket.ticketId, newStatus, {
          categoryId: categoryId || undefined,
          interactionOutcomeId: outcomeId || undefined,
        });
      } catch (err) {
        console.error("Failed to update ticket status:", err);
      }
    }
  };

  // Human agent sends a reply manually
  const handleSend = async () => {
    if (!reply.trim() || !ticket) return;
    // Away agents can only send internal notes, not public replies
    if (isAway && !isInternal) return;

    try {
      await sendMessage(ticket.ticketId, {
        content: reply.trim(),
        isInternal,
      }, {
        uid: currentUser?.uid ?? "",
        displayName: currentUser?.displayName ?? "Agent",
        role: currentUser?.role ?? "agent",
      });
      setReply("");
      setShowTemplates(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // Simulate an incoming respondent message and let AI handle it
  const handleSimulateIncoming = async () => {
    if (!simulateInput.trim() || !ticket) return;
    const incoming = simulateInput.trim();
    setSimulateInput("");
    setShowSimulate(false);
    setAiError(null);

    // Add respondent message
    const respondentMsg: Message = {
      messageId:  `resp_${Date.now()}`,
      ticketId:   ticket.ticketId,
      senderId:   "respondent",
      senderName: respondent?.fullName ?? "Respondent",
      senderRole: "system" as const, // displayed differently
      content:    incoming,
      isInternal: false,
      createdAt:  new Date().toISOString(),
    };
    setMessages((prev) => [...prev, respondentMsg]);

    // Detect escalation immediately
    const trigger = detectEscalation(incoming, { enabled: aiEnabled, autoReply: false, systemPrompt: "", escalationTriggers: [], channelToggles: {} });
    if (trigger) {
      setEscalation(trigger);
      setHandledBy("escalated");
      // Add system escalation notice
      const escalationMsg: Message = {
        messageId:  `esc_${Date.now()}`,
        ticketId:   ticket.ticketId,
        senderId:   "system",
        senderName: "System",
        senderRole: "system",
        content:    `AI detected escalation trigger: ${trigger.label}. Keywords: "${trigger.detectedKeywords.join('", "')}". Confidence: ${Math.round(trigger.confidence * 100)}%. Flagged for human review.`,
        isInternal: true,
        createdAt:  new Date().toISOString(),
      };
      setMessages((prev) => [...prev, escalationMsg]);
    }

    // If AI is enabled and ticket is in AI mode, generate AI reply
    if (aiEnabled && handledBy === "ai") {
      setAiTyping(true);
      try {
        await sleep(1200); // simulate thinking
        const { reply: aiReply } = await generateAIReply(
          incoming,
          messages,
          { enabled: aiEnabled, autoReply: false, systemPrompt: "", escalationTriggers: [], channelToggles: {} },
          respondent?.fullName
        );
        const aiMsg: Message = {
          messageId:     `ai_${Date.now()}`,
          ticketId:      ticket.ticketId,
          senderId:      "ai",
          senderName:    "AI Assistant",
          senderRole:    "ai",
          content:       aiReply,
          isInternal:    false,
          aiGenerated:   true,
          escalationTriggered: trigger?.reason ?? null,
          createdAt:     new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        if (trigger) {
          // Add internal note about escalation post-reply
          const noteMsg: Message = {
            messageId:  `note_${Date.now()}`,
            ticketId:   ticket.ticketId,
            senderId:   "ai",
            senderName: "AI Assistant",
            senderRole: "ai",
            content:    `I have responded to ${respondent?.fullName ?? "the respondent"} but this conversation requires human follow-up due to: ${trigger.label}. Please review and take over when ready.`,
            isInternal: true,
            aiGenerated: true,
            createdAt:  new Date(Date.now() + 100).toISOString(),
          };
          setMessages((prev) => [...prev, noteMsg]);
        }
      } catch (err) {
        setAiError("AI response failed. Please reply manually.");
      } finally {
        setAiTyping(false);
      }
    }
  };

  const handleTakeOver = () => {
    if (!ticket) return;
    setHandledBy("human");
    const noteMsg: Message = {
      messageId:  `takeover_${Date.now()}`,
      ticketId:   ticket.ticketId,
      senderId:   currentUser?.uid ?? "",
      senderName: currentUser?.displayName ?? "Agent",
      senderRole: "system",
      content:    `Agent ${currentUser?.displayName ?? "Agent"} has taken over this conversation.`,
      isInternal: true,
      createdAt:  new Date().toISOString(),
    };
    setMessages((prev) => [...prev, noteMsg]);
  };

  const applyTemplate = (text: string) => {
    setReply(text);
    setShowTemplates(false);
    setIsInternal(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (ticketLoading || !ticket) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading ticket...</p>
        </div>
      </div>
    );
  }

  const grouped = groupByDate(messages);

  const handlePrint = () => {
    const messageRows = messages.map((m) => `
      <div class="message ${m.isInternal ? "internal" : "public"}">
        <div class="message-header">
          <span class="message-sender">${m.senderName}</span>
          <span style="display:flex;gap:8px;align-items:center;">
            <span class="message-label">${m.aiGenerated ? "AI Reply" : m.isInternal ? "Internal Note" : "Public Reply"}</span>
            <span class="message-time">${new Date(m.createdAt).toLocaleString()}</span>
          </span>
        </div>
        <div class="message-body">${m.content}</div>
      </div>`).join("");
    print(`
      <h2>${ticket.subject}</h2>
      <div style="display:flex;gap:8px;margin:8px 0 20px;flex-wrap:wrap;">
        <span class="badge badge-${ticket.status}">${ticket.status.replace("_"," ")}</span>
        <span class="badge badge-${ticket.priority}">${ticket.priority} priority</span>
        <span style="font-size:11px;color:#888;font-family:monospace;">${ticket.ticketNumber}</span>
      </div>
      <div class="meta-grid">
        <div class="meta-cell"><div class="label">Respondent</div><div class="value">${respondent?.fullName ?? "Unknown"}</div></div>
        <div class="meta-cell"><div class="label">Assigned Agent</div><div class="value">${ticket.assignedAgentName ?? "Unassigned"}</div></div>
        <div class="meta-cell"><div class="label">Handled By</div><div class="value">${handledBy}</div></div>
        <div class="meta-cell"><div class="label">Category</div><div class="value">${ticket.categoryName ?? "—"}</div></div>
      </div>
      <h3>Conversation Thread</h3>
      ${messageRows}
    `, `${ticket.ticketNumber} — ${ticket.subject}`);
  };

  return (
    <div className="flex flex-col gap-3 h-full max-h-[calc(100vh-8rem)]">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/tickets" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={14} />Ticket Queue
          </Link>
          <span className="text-muted-foreground/40 text-xs">/</span>
          <span className="text-xs text-foreground font-medium font-mono">{ticket.ticketNumber}</span>
        </div>
        <button
          className="lg:hidden text-xs text-primary flex items-center gap-1 font-medium"
          onClick={() => setShowRightPanel((v) => !v)}
        >
          {showRightPanel ? "Hide info" : "Ticket info"}
          <ChevronDown size={13} className={cn("transition-transform", showRightPanel && "rotate-180")} />
        </button>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* LEFT — Conversation */}
        <div className={cn("flex flex-col gap-3 min-w-0 flex-1", showRightPanel ? "hidden lg:flex" : "flex")}>

          {/* Escalation Banner */}
          {escalation && (
            <div className={cn(
              "flex items-start gap-3 px-4 py-3 rounded-lg border text-sm font-medium",
              ESCALATION_COLORS[escalation.reason]
            )}>
              <span className="flex-shrink-0 mt-0.5">{ESCALATION_ICON_MAP[escalation.reason]}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs uppercase tracking-wide mb-0.5">
                  Human Attention Required — {escalation.label}
                </p>
                <p className="text-xs font-normal opacity-80 leading-relaxed">
                  AI detected keywords: <strong>{escalation.detectedKeywords.map((k) => `"${k}"`).join(", ")}</strong>. Confidence: {Math.round(escalation.confidence * 100)}%.
                  {handledBy === "escalated" && " This ticket has been flagged and is waiting for a human agent."}
                </p>
              </div>
              {handledBy !== "human" && (
                <Button
                  size="sm"
                  onClick={handleTakeOver}
                  className="flex-shrink-0 h-7 text-xs gap-1.5 bg-foreground text-background hover:bg-foreground/90"
                >
                  <UserCheck size={11} />Take Over
                </Button>
              )}
            </div>
          )}

          {/* AI Mode status bar */}
          <div className={cn(
            "flex items-center justify-between px-3 py-2 rounded-md border text-xs",
            handledBy === "ai"       ? "bg-blue-50 border-blue-200 text-blue-800" :
            handledBy === "escalated"? "bg-orange-50 border-orange-200 text-orange-800" :
                                       "bg-green-50 border-green-200 text-green-800"
          )}>
            <div className="flex items-center gap-2">
              {handledBy === "human" ? <UserCheck size={12} /> : <Bot size={12} />}
              <span className="font-medium">
                {handledBy === "ai"        ? "AI is handling this conversation" :
                 handledBy === "escalated" ? "Escalated — waiting for human agent" :
                                             "Human agent is handling this conversation"}
              </span>
              {aiEnabled && (
                <span className="flex items-center gap-1 opacity-70">
                  <span className={cn("w-1.5 h-1.5 rounded-full", handledBy === "ai" ? "bg-blue-500 animate-pulse" : "bg-muted-foreground")} />
                  AI {handledBy === "ai" ? "active" : "standby"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {handledBy !== "human" && (
                <button
                  onClick={handleTakeOver}
                  className="flex items-center gap-1 text-[10px] font-semibold hover:underline opacity-80"
                >
                  <UserCheck size={10} />Take over
                </button>
              )}
              <button
                onClick={() => setShowSimulate((v) => !v)}
                className="flex items-center gap-1 text-[10px] font-semibold hover:underline opacity-60"
              >
                <Sparkles size={10} />Simulate message
              </button>
            </div>
          </div>

          {/* Simulate incoming message panel */}
          {showSimulate && (
            <Card className="border border-dashed border-primary/40 shadow-none bg-primary/5">
              <CardContent className="p-3">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Sparkles size={9} />Simulate Incoming Message from Respondent
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={simulateInput}
                    onChange={(e) => setSimulateInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSimulateIncoming(); }}
                    placeholder='e.g. "I would like to request a prayer for my family..."'
                    className="flex-1 h-8 text-xs border border-border rounded-md px-3 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleSimulateIncoming} disabled={!simulateInput.trim() || aiTyping}>
                    <Send size={10} />Send
                  </Button>
                  <button onClick={() => setShowSimulate(false)} className="p-1.5 text-muted-foreground hover:text-foreground">
                    <X size={13} />
                  </button>
                </div>
                <p className="text-[9px] text-muted-foreground mt-1.5">
                  Try: "I want to know who is Jesus" / "I have been feeling very depressed" / "Can you pray for me?"
                </p>
              </CardContent>
            </Card>
          )}

          {aiError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
              <AlertTriangle size={12} />
              {aiError}
              <button onClick={() => setAiError(null)} className="ml-auto"><X size={11} /></button>
            </div>
          )}

          {/* Subject card */}
          <Card className="border border-border shadow-none flex-shrink-0">
            <CardContent className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground font-mono mb-0.5">{ticket.ticketNumber}</p>
                  <h3 className="text-sm font-semibold text-foreground leading-snug">{ticket.subject}</h3>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <TicketPriorityBadge priority={ticket.priority} />
                  <TicketStatusBadge status={status} />
                  <button onClick={handlePrint} title="Print / Export PDF"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Printer size={13} />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversation thread */}
          <Card className="flex-1 border border-border shadow-none flex flex-col overflow-hidden">
            <CardHeader className="py-2.5 px-4 border-b border-border flex-shrink-0">
              <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Conversation
              </CardTitle>
            </CardHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
              {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-12">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Send size={16} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No messages yet.</p>
                </div>
              )}

              {grouped.map((group) => (
                <div key={group.date} className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-3 my-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-muted-foreground font-medium px-2 whitespace-nowrap">{group.date}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {group.messages.map((msg) => {
                    // System messages — center line
                    if (msg.senderRole === "system") {
                      return (
                        <div key={msg.messageId} className="flex items-start gap-2 px-2">
                          <div className="flex-1 h-px bg-border/60 mt-2" />
                          <p className="text-[10px] text-muted-foreground/60 italic whitespace-pre-wrap max-w-xs text-center px-2 leading-relaxed">{msg.content}</p>
                          <div className="flex-1 h-px bg-border/60 mt-2" />
                        </div>
                      );
                    }

                    const isAI    = msg.senderRole === "ai";
                    const isAgent = msg.senderRole === "agent" || msg.senderRole === "admin" || msg.senderRole === "supervisor";
                    const isRight = isAI || isAgent;
                    const initials = msg.senderName.split(" ").map((n: string) => n[0]).join("").toUpperCase();

                    return (
                      <div key={msg.messageId} className={cn("flex gap-2.5 group", isRight ? "flex-row-reverse" : "flex-row")}>
                        {/* Avatar */}
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-1",
                          isAI    ? "bg-blue-100 text-blue-700" :
                          isAgent ? "bg-primary/10 text-primary" :
                                    "bg-muted text-muted-foreground"
                        )}>
                          {isAI ? <Bot size={13} /> : isAgent ? initials : <User size={13} />}
                        </div>

                        <div className={cn("flex flex-col gap-1 max-w-[75%]", isRight ? "items-end" : "items-start")}>
                          <div className={cn("flex items-center gap-2", isRight ? "flex-row-reverse" : "flex-row")}>
                            <span className="text-[10px] font-semibold text-foreground">{msg.senderName}</span>
                            {isAI && (
                              <span className="flex items-center gap-0.5 text-[9px] text-blue-600 font-semibold uppercase bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                                <Bot size={7} />AI
                              </span>
                            )}
                            {msg.isInternal && (
                              <span className="flex items-center gap-0.5 text-[9px] text-amber-600 font-semibold uppercase bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                <Lock size={7} />Note
                              </span>
                            )}
                            {msg.escalationTriggered && (
                              <span className={cn(
                                "flex items-center gap-0.5 text-[9px] font-semibold uppercase rounded px-1.5 py-0.5 border",
                                ESCALATION_COLORS[msg.escalationTriggered]
                              )}>
                                <ShieldAlert size={7} />Escalated
                              </span>
                            )}
                          </div>
                          <div className={cn(
                            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                            isAI
                              ? msg.isInternal
                                ? "bg-blue-50 border border-blue-200 text-blue-900 rounded-tr-sm"
                                : "bg-blue-600 text-white rounded-tr-sm"
                              : isAgent
                                ? msg.isInternal
                                  ? "bg-amber-50 border border-amber-200 text-amber-900 rounded-tr-sm"
                                  : "bg-emerald-500 text-white rounded-tr-sm"
                                : "bg-white border border-border text-foreground rounded-tl-sm"
                          )}>
                            {msg.content}
                          </div>
                          <span className="text-[9px] text-muted-foreground/60 px-1">{formatTime(msg.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* AI typing indicator */}
              {aiTyping && (
                <div className="flex gap-2.5 flex-row-reverse">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={13} className="text-blue-700" />
                  </div>
                  <div className="flex flex-col items-end gap-1 max-w-[75%]">
                    <span className="text-[10px] font-semibold text-foreground">AI Assistant</span>
                    <div className="bg-blue-600 rounded-2xl rounded-tr-sm px-4 py-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Reply Templates */}
            {showTemplates && (
              <div className="border-t border-border bg-muted/30 p-3 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Zap size={10} />Quick Reply Templates
                  </span>
                  <button onClick={() => setShowTemplates(false)} className="p-0.5 rounded hover:bg-muted transition-colors">
                    <X size={12} className="text-muted-foreground" />
                  </button>
                </div>
                <div className="flex flex-col gap-1 max-h-44 overflow-y-auto">
                  {quickReplies.map((tpl) => (
                    <button key={tpl.id} onClick={() => applyTemplate(tpl.text)}
                      className="text-left px-3 py-2 rounded-md hover:bg-background border border-transparent hover:border-border transition-all group">
                      <p className="text-xs font-medium text-foreground group-hover:text-primary">{tpl.label}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{tpl.text}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reply box */}
            <div className="border-t border-border p-3 flex-shrink-0 bg-background">
              {/* Away status warning */}
              {isAway && !isInternal && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                  <AlertTriangle size={11} className="text-amber-600 flex-shrink-0" />
                  <p className="text-[10px] text-amber-700 flex-1">
                    Your status is <strong>Away</strong> — cannot send public replies. Change to <strong>Online</strong> or send an <strong>Internal Note</strong>.
                  </p>
                </div>
              )}
              {handledBy === "ai" && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <Bot size={11} className="text-blue-600 flex-shrink-0" />
                  <p className="text-[10px] text-blue-700 flex-1">AI is handling replies. You can still send a manual reply or take over.</p>
                  <button onClick={handleTakeOver} className="text-[10px] font-semibold text-blue-700 hover:underline flex items-center gap-1">
                    <UserCheck size={9} />Take over
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowTemplates((v) => !v)}
                    className={cn("flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-md transition-colors border",
                      showTemplates ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-transparent hover:border-border")}>
                    <Zap size={9} />Templates
                  </button>
                  <button onClick={() => setIsInternal((v) => !v)}
                    className={cn("flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-md transition-colors border",
                      isInternal ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-muted text-muted-foreground border-transparent hover:border-border")}>
                    {isInternal ? <Lock size={9} /> : <Unlock size={9} />}
                    {isInternal ? "Internal Note" : "Public Reply"}
                  </button>
                </div>
                <span className="text-[10px] text-muted-foreground hidden sm:block">Ctrl+Enter to send</span>
              </div>
              <Textarea
                ref={textareaRef}
                placeholder={isInternal ? "Write an internal note..." : "Write a reply..."}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend(); }}
                className={cn("text-sm resize-none min-h-[72px] mb-2 transition-colors",
                  isInternal && "bg-amber-50 border-amber-200 focus-visible:ring-amber-300")}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={!reply.trim() || (isAway && !isInternal)}
                  onClick={handleSend}
                  className="gap-1.5"
                >
                  <Send size={12} />
                  {isInternal ? "Add Note" : "Send Reply"}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT — Ticket Info Panel */}
        <div className={cn(
          "flex flex-col gap-3 w-full lg:w-[280px] xl:w-[300px] flex-shrink-0 overflow-y-auto",
          showRightPanel ? "flex" : "hidden lg:flex"
        )}>
          {/* AI Handling Card */}
          <Card className={cn("border shadow-none", handledBy === "ai" ? "border-blue-200 bg-blue-50/50" : handledBy === "escalated" ? "border-orange-200 bg-orange-50/50" : "border-green-200 bg-green-50/50")}>
            <CardHeader className="py-2.5 px-4 border-b border-border/50">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Bot size={10} />AI Handling
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Mode</span>
                <span className={cn("text-xs font-semibold capitalize",
                  handledBy === "ai" ? "text-blue-700" : handledBy === "escalated" ? "text-orange-700" : "text-green-700")}>
                  {handledBy === "ai" ? "AI Auto-Reply" : handledBy === "escalated" ? "Escalated" : "Human Agent"}
                </span>
              </div>
              {escalation && (
                <div className={cn("flex items-start gap-1.5 p-2 rounded-md border text-[10px]", ESCALATION_COLORS[escalation.reason])}>
                  <span className="flex-shrink-0 mt-0.5">{ESCALATION_ICON_MAP[escalation.reason]}</span>
                  <div>
                    <p className="font-semibold">{escalation.label}</p>
                    <p className="opacity-75 mt-0.5">Confidence: {Math.round(escalation.confidence * 100)}%</p>
                  </div>
                </div>
              )}
              {handledBy !== "human" && (
                <Button variant="outline" size="sm" onClick={handleTakeOver} className="w-full h-7 text-xs gap-1.5">
                  <UserCheck size={10} />Take Over Conversation
                </Button>
              )}
              {handledBy === "human" && (
                <div className="flex items-center gap-1.5 text-[10px] text-green-700">
                  <UserCheck size={10} />You are now handling this conversation
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status */}
          <Card className="border border-border shadow-none">
            <CardHeader className="py-2.5 px-4 border-b border-border">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Ticket Status</CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-1.5">
                {statusFlow.map((s) => {
                  const isDisabled = (s === "resolved" || s === "closed") && !canClose;
                  return (
                    <button key={s} disabled={isDisabled} onClick={() => handleStatusChange(s)}
                      className={cn("px-2 py-1.5 rounded-md text-xs font-medium transition-all border",
                        status === s ? "border-primary bg-primary text-white" :
                        isDisabled ? "border-border bg-muted/30 text-muted-foreground/40 cursor-not-allowed" :
                        "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary")}>
                      {s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  );
                })}
              </div>
              {!canClose && (
                <div className="flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-md">
                  <AlertTriangle size={11} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-amber-700 leading-relaxed">Set <strong>Category</strong> and <strong>Outcome</strong> to resolve or close.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Classification */}
          <Card className="border border-border shadow-none">
            <CardHeader className="py-2.5 px-4 border-b border-border">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Classification</CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex flex-col gap-2.5">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1.5">
                  <Tag size={9} />Category
                </label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select category..." /></SelectTrigger>
                  <SelectContent>
                    {categories.filter((c: any) => c.isActive).map((c) => (
                      <SelectItem key={c.id || c.categoryId} value={c.id || c.categoryId}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1.5">
                  <CheckCircle2 size={9} />Outcome
                </label>
                <Select value={outcomeId} onValueChange={setOutcomeId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select outcome..." /></SelectTrigger>
                  <SelectContent>
                    {outcomes.filter((o: any) => o.isActive).map((o) => (
                      <SelectItem key={o.id || o.outcomeId} value={o.id || o.outcomeId}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="outline" className="w-full h-8 text-xs">Save Classification</Button>
            </CardContent>
          </Card>

          {/* Agent Notes */}
          <Card className="border-2 border-amber-300 shadow-none bg-amber-50/30">
            <CardHeader className="py-3 px-4 border-b border-amber-200 bg-amber-50">
              <CardTitle className="text-xs font-semibold text-amber-800 flex items-center gap-2">
                <StickyNote size={14} className="text-amber-600" />
                Counseling Notes
                {agentNotes.length > 0 && (
                  <span className="ml-auto bg-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {agentNotes.length}
                  </span>
                )}
              </CardTitle>
              <p className="text-[10px] text-amber-600 mt-0.5">
                Record counseling observations, prayer points, and follow-up actions for this ticket.
              </p>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-2.5">
              {agentNotes.length === 0 && (
                <div className="text-center py-4">
                  <StickyNote size={20} className="mx-auto text-amber-300 mb-2" />
                  <p className="text-xs text-amber-600/70 italic">No counseling notes yet. Add your first note below.</p>
                </div>
              )}
              {agentNotes.map((n) => (
                <div key={n.id} className="group relative flex flex-col gap-0.5 p-3 rounded-lg bg-white border border-amber-200">
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{n.text}</p>
                  <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-amber-100">
                    <span className="text-[10px] text-amber-700 font-medium">{n.author}</span>
                    <span className="text-[10px] text-amber-500">
                      {new Date(n.createdAt).toLocaleString("en-US", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <button
                    onClick={() => removeNote(n.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-amber-400 hover:text-red-500"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
              {/* Add note input */}
              <div className="flex flex-col gap-2 mt-1 p-3 rounded-lg border border-dashed border-amber-300 bg-white">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addNote(); }}
                  placeholder="Write counseling notes, prayer points, follow-up actions... (Ctrl+Enter to save)"
                  rows={4}
                  className="w-full text-xs border border-amber-200 rounded-md px-3 py-2.5 resize-none bg-background focus:outline-none focus:ring-2 focus:ring-amber-300/50 placeholder:text-muted-foreground/50"
                />
                <button
                  onClick={addNote}
                  disabled={!newNote.trim()}
                  className="self-end flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 disabled:opacity-40 transition-colors"
                >
                  <Plus size={12} /> Add Note
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Issue Categories — editable by agent */}
          <Card className="border border-border shadow-none">
            <CardHeader className="py-2.5 px-4 border-b border-border">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Tag size={10} />Issue Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex flex-col gap-2.5">
              {/* Current tags */}
              {problemCategories.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {problemCategories.map((cat) => (
                    <span
                      key={cat}
                      className="group flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary"
                    >
                      {cat}
                      <button
                        onClick={() => removeProblemCategory(cat)}
                        className="opacity-50 group-hover:opacity-100 hover:text-red-500 transition-all ml-0.5"
                      >
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground/60 italic">No issue categories yet.</p>
              )}

              {/* Preset suggestions */}
              <div className="flex flex-wrap gap-1">
                {["Anxiety", "Depression", "Marriage", "Grief", "Addiction", "Financial", "Faith", "Family", "Health"].map((preset) => (
                  !problemCategories.includes(preset) && (
                    <button
                      key={preset}
                      onClick={() => setProblemCategories((prev) => [...prev, preset])}
                      className="text-[9px] px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      + {preset}
                    </button>
                  )
                ))}
              </div>

              {/* Custom input */}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addProblemCategory(); } }}
                  placeholder="Add another category..."
                  className="flex-1 h-7 text-xs border border-border rounded-md px-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                />
                <button
                  onClick={addProblemCategory}
                  disabled={!newCategoryInput.trim()}
                  className="h-7 w-7 flex items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* Progress badge */}
              {respondent?.progress && (
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <span className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wide">Progress:</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                    {respondent.progress}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Respondent */}
          <Card className="border border-border shadow-none">
            <CardHeader className="py-2.5 px-4 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Respondent</CardTitle>
              {respondent && (
                <Link href={`/dashboard/respondents/${respondent.respondentId}`} className="text-[10px] text-primary hover:underline">
                  View profile
                </Link>
              )}
            </CardHeader>
            <CardContent className="p-3 flex flex-col gap-2">
              {respondent ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-bold flex-shrink-0">
                      {respondent.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-tight">{respondent.fullName}</p>
                      <p className="text-[10px] text-muted-foreground">{respondent.leadSourceName}</p>
                    </div>
                  </div>
                  {respondent.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone size={10} className="flex-shrink-0 text-muted-foreground/50" />{respondent.phone}
                    </div>
                  )}
                  {respondent.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail size={10} className="flex-shrink-0 text-muted-foreground/50" />{respondent.email}
                    </div>
                  )}
                  {respondent.notes && (
                    <p className="text-[10px] text-muted-foreground bg-muted/50 rounded-md p-2 leading-relaxed">
                      {respondent.notes}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Respondent not found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
