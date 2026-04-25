"use client";

import { useEffect, useRef, useState, useCallback, DragEvent } from "react";
import { useChat, Message } from "ai/react";
import { Send, Square, RotateCcw, ThumbsUp, ThumbsDown, Copy, Check, Paperclip, Mic, Mic2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { AttachmentPreview, PendingAttachment } from "./AttachmentPreview";
import { VoiceRecorder } from "./VoiceRecorder";
import { VoiceMode } from "./VoiceMode";
import { ToolResultRenderer } from "../cards/ToolResultRenderer";
import { nanoid } from "nanoid";

type ContentPart = { type: "text"; text: string } | { type: "image"; image: string };

function UserMessageContent({ content }: { content: string }) {
  // Try to parse as array of parts (multimodal message)
  let parts: ContentPart[] | null = null;
  if (content.startsWith("[")) {
    try { parts = JSON.parse(content); } catch { /* plain text */ }
  }

  if (parts) {
    return (
      <div className="space-y-2">
        {parts.map((part, i) =>
          part.type === "image" ? (
            <img key={i} src={part.image} alt="attachment" className="max-w-xs rounded-xl max-h-64 object-contain" />
          ) : (
            <p key={i} className="whitespace-pre-wrap">{part.text}</p>
          )
        )}
      </div>
    );
  }

  return <p className="whitespace-pre-wrap">{content}</p>;
}

interface ChatViewProps {
  conversationId: string;
  initialMessages: { id: string; role: "user" | "assistant"; content: string }[];
  prefillMessage?: string;
}

const SUGGESTIONS = [
  "Log today's workout",
  "Set a new goal",
  "What should I do today?",
  "Check my progress",
];

export function ChatView({ conversationId, initialMessages, prefillMessage }: ChatViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);

  const { messages, input, setInput, handleSubmit, isLoading, stop, reload, error, append } = useChat({
    api: "/api/chat",
    initialMessages,
    body: { conversationId },
    onError: (err: Error) => toast.error(err.message || "Something went wrong"),
  });

  // Auto-resume: if the ONLY unanswered message is a single user message at the end,
  // trigger a completion. Skip if there are consecutive user messages (failed retries)
  // — those will be merged server-side but the user should just re-send.
  useEffect(() => {
    const msgs = initialMessages;
    const last = msgs[msgs.length - 1];
    const secondLast = msgs[msgs.length - 2];
    // Only auto-resume when exactly one unanswered user message (not a pile of failed retries)
    if (last?.role === "user" && secondLast?.role !== "user") {
      reload();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-send prefill message when the conversation is empty (e.g. from goal cards)
  useEffect(() => {
    if (prefillMessage) {
      append({ role: "user", content: prefillMessage });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && voiceMode) setVoiceMode(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [voiceMode]);

  // ── Image resize helper ─────────────────────────────────────────────────────
  function resizeImageToDataUrl(file: File, maxPx: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("canvas")); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = objectUrl;
    });
  }

  // ── Upload helpers ──────────────────────────────────────────────────────────
  async function uploadFile(file: File): Promise<PendingAttachment> {
    const id = nanoid();
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
    const type = file.type.startsWith("image/") ? "image"
      : file.type.startsWith("audio/") ? "audio"
      : file.type.startsWith("video/") ? "video"
      : "document";

    // Images: resize+compress on canvas then encode as base64 — avoids iOS crash and large bodies
    if (type === "image") {
      // HEIC/HEIF not supported by browser canvas — give a clear error
      if (file.type === "image/heic" || file.type === "image/heif" || file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")) {
        toast.error("HEIC photos aren't supported yet. Please convert to JPEG first (share → save image in Photos app).");
        return { id, file, type, uploading: false } as PendingAttachment;
      }
      const pending: PendingAttachment = { id, file, type, previewUrl, uploading: true };
      setPendingAttachments((prev) => [...prev, pending]);
      try {
        const dataUrl = await resizeImageToDataUrl(file, 1120, 0.82);
        const updated: PendingAttachment = { ...pending, uploading: false, url: dataUrl };
        setPendingAttachments((prev) => prev.map((a) => a.id === id ? updated : a));
        return updated;
      } catch {
        toast.error("Could not process image: " + file.name);
        setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
        throw new Error("image processing failed");
      }
    }

    const pending: PendingAttachment = { id, file, type, previewUrl, uploading: true };
    setPendingAttachments((prev) => [...prev, pending]);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const updated: PendingAttachment = { ...pending, uploading: false, url: data.url, transcript: data.transcript, documentText: data.documentText };
      setPendingAttachments((prev) => prev.map((a) => a.id === id ? updated : a));
      return updated;
    } catch {
      toast.error("Upload failed for " + file.name);
      setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
      throw new Error("upload failed");
    }
  }

  function handleFiles(files: FileList | File[]) {
    Array.from(files).forEach((f) => uploadFile(f));
  }

  // ── Drag & drop ─────────────────────────────────────────────────────────────
  function onDragOver(e: DragEvent) { e.preventDefault(); setDragging(true); }
  function onDragLeave() { setDragging(false); }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }

  // ── Paste ───────────────────────────────────────────────────────────────────
  function onPaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData.items)
      .filter((i) => i.kind === "file")
      .map((i) => i.getAsFile())
      .filter(Boolean) as File[];
    if (files.length) handleFiles(files);
  }

  // ── Submit with attachments ─────────────────────────────────────────────────
  async function submitWithAttachments(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() && pendingAttachments.length === 0) return;
    if (isLoading) return;

    // Build content parts
    const parts: { type: string; text?: string; image?: string; data?: string; mimeType?: string; name?: string }[] = [];

    if (input.trim()) parts.push({ type: "text", text: input.trim() });

    for (const att of pendingAttachments) {
      if (att.type === "image" && att.url) {
        parts.push({ type: "image", image: att.url });
      } else if ((att.type === "audio" || att.type === "video") && att.transcript) {
        parts.push({ type: "text", text: `[Voice message transcript]: ${att.transcript}` });
      } else if (att.type === "document" && att.documentText) {
        parts.push({ type: "text", text: `[Document: ${att.file.name}]\n${att.documentText}` });
      }
    }

    setInput("");
    setPendingAttachments([]);

    if (parts.length === 1 && parts[0].type === "text") {
      await append({ role: "user", content: parts[0].text! });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await append({ role: "user", content: parts as any });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitWithAttachments(e as unknown as React.FormEvent);
    }
    if (e.key === "Escape" && isLoading) stop();
  }

  async function copyMessage(content: string, id: string) {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function sendFeedback(messageId: string, rating: 1 | -1) {
    await fetch(`/api/messages/${messageId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    toast.success(rating === 1 ? "Thanks!" : "Got it.");
  }

  function handleVoiceTranscript(text: string) {
    setVoiceMode(false);
    setInput(text);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  return (
    <div
      className={cn("flex flex-col h-[calc(100vh-7rem)] relative", dragging && "ring-2 ring-primary ring-inset")}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragging && (
        <div className="absolute inset-0 z-20 glass flex items-center justify-center">
          <p className="text-primary font-medium">Drop files to attach</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="py-20 fu">
            <h2 className="font-serif text-display-sm font-light text-text-primary mb-1">Vita</h2>
            <p className="text-body text-text-muted max-w-sm">
              Your private coach. Tell me your goal, ask me anything, or say what you did today.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-caption px-3 py-1.5 rounded border border-border-subtle bg-bg-surface text-text-muted hover:border-border-default hover:text-text-secondary transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message: Message) => (
          <div key={message.id} className={cn(
            "group",
            message.role === "user" ? "flex justify-end" : "block"
          )}>
            {message.role === "user" ? (
              /* User: right-aligned bubble, bg-elevated */
              <div className="max-w-[75%] space-y-1">
                <div className="bg-bg-elevated border border-border-subtle rounded-lg rounded-br px-4 py-2.5 text-body text-text-primary">
                  <UserMessageContent content={message.content} />
                </div>
              </div>
            ) : (
              /* Vita: no bubble — typeset directly on page */
              <div className="space-y-2">
                <div className="prose prose-sm max-w-none text-body text-text-primary [&>p]:mb-3 [&>p:last-child]:mb-0 [&>ul]:space-y-1 [&>ol]:space-y-1 [&>h1,h2,h3]:font-serif [&>h1,h2,h3]:font-light [&>h1,h2,h3]:text-text-primary [&>strong]:font-medium [&>strong]:text-text-primary [&>a]:text-champagne [&>a]:underline [&>a]:underline-offset-2 [&>code]:bg-bg-elevated [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-caption [&>code]:font-mono">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>

                {/* Tool cards */}
                {message.toolInvocations && message.toolInvocations.map((inv) =>
                  inv.state === "result" ? (
                    <ToolResultRenderer key={inv.toolCallId} toolName={inv.toolName} result={inv.result} />
                  ) : null
                )}

                {/* Message actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button onClick={() => copyMessage(message.content, message.id)}
                    className="p-1 rounded text-text-disabled hover:text-text-muted transition-colors" aria-label="Copy">
                    {copiedId === message.id ? <Check size={11} strokeWidth={1.5} /> : <Copy size={11} strokeWidth={1.5} />}
                  </button>
                  <button onClick={() => sendFeedback(message.id, 1)}
                    className="p-1 rounded text-text-disabled hover:text-sage transition-colors" aria-label="Helpful">
                    <ThumbsUp size={11} strokeWidth={1.5} />
                  </button>
                  <button onClick={() => sendFeedback(message.id, -1)}
                    className="p-1 rounded text-text-disabled hover:text-terracotta transition-colors" aria-label="Not helpful">
                    <ThumbsDown size={11} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 items-center">
            {[0, 120, 240].map((delay) => (
              <span key={delay} className="w-1 h-1 rounded-full bg-text-muted animate-pulse"
                style={{ animationDelay: `${delay}ms`, animationDuration: "1.2s" }} />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-xs text-destructive mb-2">{error.message}</p>
            <button onClick={() => reload()} className="text-xs text-primary underline flex items-center gap-1 mx-auto">
              <RotateCcw size={10} /> Retry
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 pb-3 pt-2 border-t border-border-subtle">
        <div className="rounded-md border border-border-default bg-bg-inset overflow-hidden focus-within:border-champagne/40 transition-colors">
          <AttachmentPreview
            attachments={pendingAttachments}
            onRemove={(id) => setPendingAttachments((prev) => prev.filter((a) => a.id !== id))}
          />
          <form onSubmit={submitWithAttachments} className="flex items-end gap-2 px-3 py-2">
            <label className="p-1.5 rounded text-text-disabled hover:text-text-muted transition-colors shrink-0 cursor-pointer" title="Attach file">
              <Paperclip size={14} strokeWidth={1.5} />
              <input type="file" multiple accept="image/*,.pdf,.txt" className="sr-only"
                onChange={(e) => e.target.files && handleFiles(e.target.files)} />
            </label>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={onPaste}
              placeholder="Say anything..."
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-body text-text-primary placeholder:text-text-disabled max-h-40 overflow-y-auto py-1.5 font-sans"
              style={{ minHeight: "36px" }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 160) + "px";
              }}
            />

            <VoiceRecorder onRecorded={(file) => uploadFile(file)} />

            <button type="button" onClick={() => setVoiceMode(true)}
              className="p-1.5 rounded text-text-disabled hover:text-text-muted transition-colors shrink-0" title="Voice mode">
              <Mic2 size={14} strokeWidth={1.5} />
            </button>

            {isLoading ? (
              <button type="button" onClick={stop}
                className="p-1.5 rounded border border-terracotta/40 text-terracotta shrink-0 hover:bg-terracotta-soft transition-colors">
                <Square size={14} strokeWidth={1.5} />
              </button>
            ) : (
              <button type="submit"
                disabled={!input.trim() && pendingAttachments.length === 0}
                className="p-1.5 rounded bg-champagne text-champagne-fg shrink-0 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-champagne-soft transition-colors">
                <Send size={14} strokeWidth={1.5} />
              </button>
            )}
          </form>
        </div>
        <p className="text-[10px] text-text-disabled text-center mt-2">
          Not medical advice. Consult a healthcare professional before starting new programmes.
        </p>
      </div>

      {/* Voice mode overlay */}
      {voiceMode && <VoiceMode onClose={() => setVoiceMode(false)} onTranscript={handleVoiceTranscript} />}
    </div>
  );
}
