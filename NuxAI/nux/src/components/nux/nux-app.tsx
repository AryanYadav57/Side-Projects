"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ClipboardEvent } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
  Copy,
  ImageUp,
  Menu,
  Pin,
  Plus,
  RefreshCcw,
  Search,
  SendHorizonal,
  Shield,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import type { ChatMessage, ChatThread, ImageAnalysisResult } from "@/types/chat";
import { CRISIS_CHECKLIST } from "@/lib/crisis";

const STORAGE_KEY = "nux-chat-threads";
const FOLLOW_UP_CHIPS = [
  "What interactions should I avoid?",
  "What are emergency red flags?",
  "Give safer next steps.",
];

function createId(): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `nux-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // no-op when storage is unavailable on the browser.
  }
}

const starterMessage: ChatMessage = {
  id: createId(),
  role: "assistant",
  createdAt: new Date().toISOString(),
  content:
    "I am Nux. Ask about effects, interactions, warning signs, and safer next steps. I cannot assist with sourcing or unsafe use.",
};

function createThread(): ChatThread {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title: "New Safety Chat",
    createdAt: now,
    updatedAt: now,
    pinned: false,
    archived: false,
    messages: [starterMessage],
  };
}

function timeStamp(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dayGroup(iso: string): "Today" | "Yesterday" | "Earlier" {
  const now = new Date();
  const date = new Date(iso);

  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((startToday.getTime() - startDate.getTime()) / 86400000);

  if (diffDays <= 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  return "Earlier";
}

export default function NuxApp() {
  const rootRef = useRef<HTMLDivElement>(null);
  const messagePaneRef = useRef<HTMLDivElement>(null);

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [query, setQuery] = useState("");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showCrisisPanel, setShowCrisisPanel] = useState(false);
  const [showComposerInfo, setShowComposerInfo] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [attachedImageName, setAttachedImageName] = useState<string | null>(null);
  const [feedbackByMessage, setFeedbackByMessage] = useState<Record<string, "up" | "down">>({});

  useEffect(() => {
    const raw = safeStorageGet(STORAGE_KEY);
    if (!raw) {
      const first = createThread();
      setThreads([first]);
      setActiveThreadId(first.id);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as ChatThread[];
      if (!parsed.length) {
        const first = createThread();
        setThreads([first]);
        setActiveThreadId(first.id);
        return;
      }
      setThreads(parsed);
      setActiveThreadId(parsed[0].id);
    } catch {
      const first = createThread();
      setThreads([first]);
      setActiveThreadId(first.id);
    }
  }, []);

  useEffect(() => {
    if (!threads.length) {
      return;
    }

    safeStorageSet(STORAGE_KEY, JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    gsap.defaults({ duration: 0.66, ease: "power3.out" });
    gsap.fromTo(".chat-reveal", { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.07 });

    const mm = gsap.matchMedia();
    mm.add(
      {
        desktop: "(min-width: 960px)",
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (ctx) => {
        const conditions = (ctx.conditions ?? {}) as {
          desktop?: boolean;
          reduceMotion?: boolean;
        };

        if (!conditions.desktop || conditions.reduceMotion) {
          return;
        }

        gsap.to(".chat-orb-a", {
          y: "-=16",
          x: "+=12",
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
    );

    return () => mm.revert();
  }, []);

  useEffect(() => {
    if (!messagePaneRef.current) {
      return;
    }

    messagePaneRef.current.scrollTo({
      top: messagePaneRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [threads, activeThreadId, isSending, isAnalyzingImage]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? threads[0],
    [threads, activeThreadId]
  );

  const visibleThreads = useMemo(() => {
    const value = sidebarSearch.trim().toLowerCase();

    return threads
      .filter((thread) => (showArchived ? Boolean(thread.archived) : !thread.archived))
      .filter((thread) => (value ? thread.title.toLowerCase().includes(value) : true))
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) {
          return a.pinned ? -1 : 1;
        }

        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [threads, sidebarSearch, showArchived]);

  const groupedThreads = useMemo(() => {
    const groups: Record<"Today" | "Yesterday" | "Earlier", ChatThread[]> = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    for (const thread of visibleThreads) {
      groups[dayGroup(thread.updatedAt)].push(thread);
    }

    return groups;
  }, [visibleThreads]);

  const lastAssistantMessageId = useMemo(() => {
    if (!activeThread) {
      return "";
    }

    const reverse = [...activeThread.messages].reverse();
    const hit = reverse.find((message) => message.role === "assistant");
    return hit?.id ?? "";
  }, [activeThread]);

  const updateThread = (threadId: string, updater: (thread: ChatThread) => ChatThread) => {
    setThreads((prev) => prev.map((thread) => (thread.id === threadId ? updater(thread) : thread)));
  };

  const updateMessageContent = (threadId: string, messageId: string, content: string) => {
    updateThread(threadId, (thread) => ({
      ...thread,
      messages: thread.messages.map((message) => (message.id === messageId ? { ...message, content } : message)),
      updatedAt: new Date().toISOString(),
    }));
  };

  const setThreadMessages = (threadId: string, updater: (messages: ChatMessage[]) => ChatMessage[]) => {
    updateThread(threadId, (thread) => {
      const messages = updater(thread.messages);
      const firstUserMessage = messages.find((item) => item.role === "user");

      return {
        ...thread,
        title: firstUserMessage ? firstUserMessage.content.slice(0, 46) : "New Safety Chat",
        messages,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const createNewThread = () => {
    const next = createThread();
    setThreads((prev) => [next, ...prev]);
    setActiveThreadId(next.id);
    setQuery("");
    setMobileSidebarOpen(false);
  };

  const togglePinActiveThread = () => {
    if (!activeThread) {
      return;
    }

    updateThread(activeThread.id, (thread) => ({ ...thread, pinned: !thread.pinned }));
  };

  const archiveActiveThread = () => {
    if (!activeThread) {
      return;
    }

    updateThread(activeThread.id, (thread) => ({ ...thread, archived: true, pinned: false }));

    const nextThread = threads.find((thread) => thread.id !== activeThread.id && !thread.archived);
    if (nextThread) {
      setActiveThreadId(nextThread.id);
      return;
    }

    const created = createThread();
    setThreads((prev) => [created, ...prev]);
    setActiveThreadId(created.id);
  };

  const restoreThread = (threadId: string) => {
    updateThread(threadId, (thread) => ({ ...thread, archived: false }));
    setActiveThreadId(threadId);
    setShowArchived(false);
  };

  const streamAssistantReply = async (threadId: string, text: string, assistantMessageId: string) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: threads.find((thread) => thread.id === threadId)?.messages ?? [],
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error("Stream failed");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let composed = "";

    while (!done) {
      const next = await reader.read();
      done = next.done;
      if (next.value) {
        composed += decoder.decode(next.value, { stream: !done });
        updateMessageContent(threadId, assistantMessageId, composed);
      }
    }

    if (!composed.trim()) {
      throw new Error("Empty stream");
    }
  };

  const sendChat = async (override?: string) => {
    if (!activeThread || isSending) {
      return;
    }

    const text = (override ?? query).trim();
    if (!text) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      createdAt: new Date().toISOString(),
      content: text,
    };

    const assistantMessage: ChatMessage = {
      id: createId(),
      role: "assistant",
      createdAt: new Date().toISOString(),
      content: "",
    };

    setQuery("");
    setThreadMessages(activeThread.id, (messages) => [...messages, userMessage, assistantMessage]);
    setIsSending(true);

    try {
      await streamAssistantReply(activeThread.id, text, assistantMessage.id);
    } catch {
      updateMessageContent(
        activeThread.id,
        assistantMessage.id,
        "I could not reach the model right now. For severe symptoms like breathing problems, chest pain, seizure, or unresponsiveness, call emergency services immediately."
      );
    } finally {
      setIsSending(false);
    }
  };

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // no-op
    }
  };

  const sendFeedback = async (messageId: string, helpful: boolean) => {
    setFeedbackByMessage((prev) => ({
      ...prev,
      [messageId]: helpful ? "up" : "down",
    }));

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          helpful,
          threadId: activeThread?.id,
        }),
      });
    } catch {
      // no-op
    }
  };

  const regenerateFromMessage = (assistantMessageId: string) => {
    if (!activeThread || isSending) {
      return;
    }

    const index = activeThread.messages.findIndex((msg) => msg.id === assistantMessageId);
    if (index <= 0) {
      return;
    }

    for (let i = index - 1; i >= 0; i -= 1) {
      const candidate = activeThread.messages[i];
      if (candidate.role === "user") {
        void sendChat(candidate.content);
        return;
      }
    }
  };

  const onImageUpload = async (file: File | null) => {
    if (!activeThread || !file || isAnalyzingImage) {
      return;
    }

    setAttachedImageName(file.name);

    const uploadMessage: ChatMessage = {
      id: createId(),
      role: "user",
      createdAt: new Date().toISOString(),
      content: `[Attached image] ${file.name}`,
    };

    setThreadMessages(activeThread.id, (messages) => [...messages, uploadMessage]);
    setIsAnalyzingImage(true);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Image analysis failed");
      }

      const data = (await response.json()) as ImageAnalysisResult;
      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        createdAt: new Date().toISOString(),
        content: [
          `## Image Analysis`,
          `Likely substance: ${data.likelySubstance}`,
          `Confidence: ${(data.confidence * 100).toFixed(0)}%`,
          "",
          data.summary,
          "",
          "**Risks**",
          ...data.risks.map((risk) => `- ${risk}`),
          "",
          "**Red Flags**",
          ...data.redFlags.map((flag) => `- ${flag}`),
          "",
          data.disclaimer,
        ].join("\n"),
      };

      setThreadMessages(activeThread.id, (messages) => [...messages, assistantMessage]);
    } catch {
      const fallback: ChatMessage = {
        id: createId(),
        role: "assistant",
        createdAt: new Date().toISOString(),
        content:
          "Image analysis is temporarily unavailable. Visual identification is uncertain, so avoid assumptions and rely on testing plus local medical guidance.",
      };
      setThreadMessages(activeThread.id, (messages) => [...messages, fallback]);
    } finally {
      setIsAnalyzingImage(false);
      setAttachedImageName(null);
    }
  };

  const onComposerPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (isAnalyzingImage) {
      return;
    }

    const items = Array.from(event.clipboardData?.items ?? []);
    const imageItem = items.find((item) => item.type.startsWith("image/"));
    if (!imageItem) {
      return;
    }

    const pastedImage = imageItem.getAsFile();
    if (!pastedImage) {
      return;
    }

    event.preventDefault();

    const extension = pastedImage.type.split("/")[1] ?? "png";
    const normalizedImage =
      pastedImage.name && pastedImage.name.length > 0
        ? pastedImage
        : new File([pastedImage], `pasted-image-${Date.now()}.${extension}`, {
            type: pastedImage.type || "image/png",
          });

    void onImageUpload(normalizedImage);
  };

  if (!activeThread) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0f1318] px-4 text-[#eff7ea]">
        <div className="w-full max-w-sm rounded-2xl border border-white/12 bg-white/6 p-5 text-center backdrop-blur-xl">
          <p className="font-heading text-2xl text-white/95">Preparing your chat...</p>
          <p className="mt-2 text-sm text-white/70">
            If this stays stuck, refresh once. Your conversation history is preserved when browser storage is available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative min-h-dvh overflow-hidden bg-[#0f1318] text-[#eff7ea]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_8%,#1f3f33,transparent_30%),radial-gradient(circle_at_100%_90%,#36583f,transparent_34%),linear-gradient(160deg,#0f1318,#111820_45%,#0f1318)]" />
      <div className="chat-orb-a pointer-events-none absolute -left-20 top-24 h-80 w-80 rounded-full bg-[#20503b]/45 blur-[90px]" />

      <div className="relative z-10 flex min-h-dvh w-full overflow-hidden md:grid md:h-screen md:grid-cols-[320px_1fr]">
        <aside
          className={`chat-reveal fixed inset-y-0 left-0 z-40 w-[88%] max-w-[320px] border-r border-white/10 bg-[#131920]/95 p-4 backdrop-blur-xl transition-transform duration-300 md:static md:z-auto md:h-screen md:w-auto md:max-w-none md:translate-x-0 md:border-b-0 md:p-5 ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            <Link href="/" className="font-heading text-[30px] leading-none tracking-tight text-white/95 transition hover:text-white">
              nux
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={createNewThread}
                className="rounded-xl border border-white/22 bg-white/10 p-2.5 transition hover:scale-105 hover:bg-white/20"
                aria-label="New chat"
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="rounded-xl border border-white/22 bg-white/10 p-2.5 transition hover:bg-white/20 md:hidden"
                aria-label="Close conversations"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2">
            <label className="flex flex-1 items-center gap-2 rounded-xl border border-white/16 bg-black/25 px-3 py-2 text-sm text-slate-300">
              <Search size={14} />
              <input
                value={sidebarSearch}
                onChange={(event) => setSidebarSearch(event.target.value)}
                placeholder="Search chats"
                className="w-full bg-transparent outline-none placeholder:text-slate-500"
              />
            </label>
            <button
              type="button"
              onClick={() => setShowArchived((prev) => !prev)}
              className="rounded-xl border border-white/16 bg-black/25 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-white/75 transition hover:bg-white/10"
            >
              {showArchived ? "Active" : "Archive"}
            </button>
          </div>

          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={togglePinActiveThread}
              className="inline-flex items-center gap-1 rounded-lg border border-white/16 bg-white/6 px-2.5 py-1.5 text-[11px] text-white/80 transition hover:bg-white/14"
            >
              <Pin size={12} /> {activeThread.pinned ? "Unpin" : "Pin"}
            </button>
            {!showArchived ? (
              <button
                type="button"
                onClick={archiveActiveThread}
                className="inline-flex items-center gap-1 rounded-lg border border-white/16 bg-white/6 px-2.5 py-1.5 text-[11px] text-white/80 transition hover:bg-white/14"
              >
                <Archive size={12} /> Archive
              </button>
            ) : activeThread.archived ? (
              <button
                type="button"
                onClick={() => restoreThread(activeThread.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/16 bg-white/6 px-2.5 py-1.5 text-[11px] text-white/80 transition hover:bg-white/14"
              >
                <ArchiveRestore size={12} /> Restore
              </button>
            ) : null}
          </div>

          <div className="max-h-[calc(100dvh-292px)] space-y-3 overflow-y-auto pr-1 md:max-h-[70vh]">
            {(["Today", "Yesterday", "Earlier"] as const).map((group) =>
              groupedThreads[group].length ? (
                <section key={group}>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-white/55">{group}</p>
                  <div className="space-y-2">
                    {groupedThreads[group].map((thread) => {
                      const active = thread.id === activeThread.id;
                      return (
                        <button
                          key={thread.id}
                          type="button"
                          onClick={() => {
                            setActiveThreadId(thread.id);
                            setMobileSidebarOpen(false);
                          }}
                          className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                            active
                              ? "border-emerald-200/45 bg-emerald-300/16 shadow-[0_8px_24px_rgba(14,102,68,0.28)]"
                              : "border-white/10 bg-black/18 hover:border-white/30"
                          }`}
                        >
                          <p className="line-clamp-1 text-sm font-medium">{thread.pinned ? "📌 " : ""}{thread.title}</p>
                          <p className="mt-1 text-xs text-slate-400">{new Date(thread.updatedAt).toLocaleDateString()}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-200/25 bg-emerald-400/10 p-3 text-xs text-emerald-100">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <Shield size={13} /> Harm Reduction Mode
            </div>
            Nux provides educational guidance only and never assists with sourcing or unsafe use.
          </div>
        </aside>

        {mobileSidebarOpen ? (
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[1px] md:hidden"
            aria-label="Close sidebar overlay"
          />
        ) : null}

        <main className="chat-reveal flex min-h-dvh w-full flex-col bg-[#6d8256]/8 md:h-screen">
          <header className="border-b border-white/10 px-4 py-3 backdrop-blur-md sm:px-5 md:px-8 md:py-5">
            <div className="flex items-center justify-between gap-3">
              <h1 className="font-heading text-[26px] leading-none text-white/95 sm:text-[30px]">Safety Chat</h1>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCrisisPanel(true)}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200/35 bg-rose-200/12 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-rose-100"
                >
                  Crisis Help
                </button>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white/85 md:hidden"
                >
                  <Menu size={13} /> Chats
                </button>
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.18em] text-white/68">Calm intelligence. Safer decisions.</p>
              <span className="rounded-full border border-emerald-200/35 bg-emerald-300/12 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-emerald-100/90">
                Live
              </span>
            </div>
          </header>

          <div ref={messagePaneRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 scroll-smooth sm:px-5 md:px-8 md:py-7">
            {activeThread.messages.map((message) => (
              <motion.article
                key={message.id}
                initial={{ opacity: 0, y: 12, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className={`max-w-3xl whitespace-pre-wrap rounded-2xl border p-3.5 text-sm leading-relaxed shadow-[0_14px_36px_rgba(0,0,0,0.25)] sm:p-4 ${
                  message.role === "assistant"
                    ? "border-emerald-200/30 bg-[#203a2d]/65"
                    : "ml-auto border-white/30 bg-white/14"
                }`}
              >
                <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-white/62">
                  {message.role} - {timeStamp(message.createdAt)}
                </p>
                {message.role === "assistant" ? (
                  <div className="space-y-2 text-[14px]">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      components={{
                        p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                        h3: ({ children }) => (
                          <h3 className="mt-3 rounded-lg border border-emerald-100/25 bg-emerald-200/10 px-2.5 py-1.5 text-xs uppercase tracking-[0.16em] text-emerald-100/95">
                            {children}
                          </h3>
                        ),
                        hr: () => <hr className="my-2 border-white/18" />,
                        ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <span>{message.content}</span>
                )}

                {message.role === "assistant" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void copyMessage(message.content)}
                      className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-black/20 px-2 py-1 text-[11px] text-white/75 transition hover:bg-white/12"
                    >
                      <Copy size={12} /> Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => regenerateFromMessage(message.id)}
                      disabled={isSending}
                      className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-black/20 px-2 py-1 text-[11px] text-white/75 transition hover:bg-white/12 disabled:opacity-45"
                    >
                      <RefreshCcw size={12} /> Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendFeedback(message.id, true)}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition ${
                        feedbackByMessage[message.id] === "up"
                          ? "border-emerald-200/45 bg-emerald-200/16 text-emerald-100"
                          : "border-white/20 bg-black/20 text-white/75 hover:bg-white/12"
                      }`}
                    >
                      <ThumbsUp size={12} /> Helpful
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendFeedback(message.id, false)}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition ${
                        feedbackByMessage[message.id] === "down"
                          ? "border-rose-200/45 bg-rose-200/14 text-rose-100"
                          : "border-white/20 bg-black/20 text-white/75 hover:bg-white/12"
                      }`}
                    >
                      <ThumbsDown size={12} /> Not Helpful
                    </button>
                  </div>
                ) : null}

                {message.id === lastAssistantMessageId && message.role === "assistant" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {FOLLOW_UP_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        disabled={isSending}
                        onClick={() => void sendChat(chip)}
                        className="rounded-full border border-emerald-100/35 bg-emerald-100/10 px-2.5 py-1 text-[11px] text-emerald-100/90 transition hover:bg-emerald-100/20 disabled:opacity-45"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                ) : null}
              </motion.article>
            ))}

            {isSending ? (
              <motion.article
                initial={{ opacity: 0, y: 10, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="max-w-[220px] rounded-2xl border border-emerald-200/35 bg-[#203a2d]/70 px-4 py-3 shadow-[0_14px_36px_rgba(0,0,0,0.25)]"
              >
                <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-white/62">assistant • typing</p>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      className="h-2 w-2 rounded-full bg-emerald-100/85"
                      animate={{ y: [0, -5, 0], opacity: [0.45, 1, 0.45] }}
                      transition={{ duration: 0.75, repeat: Infinity, delay: dot * 0.12, ease: "easeInOut" }}
                    />
                  ))}
                </div>
              </motion.article>
            ) : null}

            {isAnalyzingImage ? (
              <motion.article
                initial={{ opacity: 0, y: 10, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="max-w-[280px] rounded-2xl border border-emerald-200/35 bg-[#203a2d]/70 px-4 py-3 shadow-[0_14px_36px_rgba(0,0,0,0.25)]"
              >
                <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-white/62">assistant • analyzing image</p>
                <p className="text-xs text-white/80">{attachedImageName ? `Attached: ${attachedImageName}` : "Processing uploaded image..."}</p>
              </motion.article>
            ) : null}
          </div>

          <footer className="space-y-2 border-t border-white/10 px-4 py-3 backdrop-blur-lg sm:space-y-3 sm:px-5 md:px-8 md:py-5">
            <div className="flex items-center justify-between text-[11px] text-amber-100/92">
              <span className="inline-flex items-center gap-1.5">
                <AlertTriangle size={12} /> Educational only
              </span>
              <button
                type="button"
                onClick={() => setShowComposerInfo((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-md border border-white/18 bg-white/6 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/75"
              >
                Details {showComposerInfo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            {showComposerInfo ? (
              <div className="rounded-xl border border-white/12 bg-white/6 px-3 py-2 text-[11px] text-white/70">
                <p>Emergency symptoms need immediate medical support.</p>
                <p className="mt-1">Tip: paste image with Ctrl+V or Cmd+V.</p>
                <p className="mt-1">
                  Read full policy in <Link href="/safety" className="text-emerald-100/90 underline decoration-emerald-100/35 underline-offset-2">Safety Policy</Link>.
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-[auto_1fr_auto] items-end gap-2">
              <label className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-white/20 bg-white/10 text-xs transition hover:bg-white/22 sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2">
                <ImageUp size={14} />
                <span className="hidden sm:inline">{isAnalyzingImage ? "Analyzing" : "Image"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => onImageUpload(event.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>

              <textarea
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onPaste={onComposerPaste}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendChat();
                  }
                }}
                placeholder="Ask about effects, interactions, and warning signs..."
                className="h-16 min-w-0 resize-none rounded-xl border border-white/22 bg-black/26 p-3 text-sm text-white outline-none placeholder:text-white/55 focus:border-emerald-200/58 sm:h-24"
              />

              <button
                type="button"
                onClick={() => void sendChat()}
                disabled={isSending || !query.trim()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-white/12 transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-45 sm:h-24 sm:w-12"
                aria-label="Send"
              >
                {isSending ? <span className="text-xs">...</span> : <SendHorizonal size={16} />}
              </button>
            </div>
          </footer>
        </main>

        {showCrisisPanel ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 backdrop-blur-[2px] sm:items-center">
            <div className="w-full max-w-lg rounded-2xl border border-rose-200/30 bg-[#1c232b] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-rose-100/75">Immediate Support</p>
                  <h2 className="mt-1 font-heading text-2xl text-white/95">Emergency Checklist</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCrisisPanel(false)}
                  className="rounded-lg border border-white/25 bg-white/8 p-2 text-white/90 transition hover:bg-white/16"
                  aria-label="Close crisis checklist"
                >
                  <X size={14} />
                </button>
              </div>

              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-white/85">
                {CRISIS_CHECKLIST.map((item) => (
                  <li key={item} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <a href="tel:112" className="rounded-xl border border-rose-200/35 bg-rose-200/12 px-3 py-2 text-center text-xs uppercase tracking-[0.14em] text-rose-100">
                  Call Emergency
                </a>
                <button
                  type="button"
                  onClick={() => setShowCrisisPanel(false)}
                  className="rounded-xl border border-white/22 bg-white/10 px-3 py-2 text-center text-xs uppercase tracking-[0.14em] text-white/88"
                >
                  Continue Chat
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
