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
}

const SUGGESTIONS = [
  "Log today's workout",
  "Set a new goal",
  "What should I do today?",
  "Check my progress",
];

export function ChatView({ conversationId, initialMessages }: ChatViewProps) {
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
          <div className="text-center py-16 fu">
            <div className="text-4xl mb-3">🌿</div>
            <h2 className="text-lg font-semibold mb-1">Hey, I'm Vita</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Your AI fitness coach. Tell me your goal, ask me anything, or say what you did today.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 rounded-full glass glass-hover text-muted-foreground">
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Drag & drop images, docs, or voice messages — or paste from clipboard.
            </p>
          </div>
        )}

        {messages.map((message: Message) => (
          <div key={message.id} className={cn("group flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}>
            {message.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-bold text-background shrink-0 mt-0.5">
                V
              </div>
            )}

            <div className={cn("max-w-[80%] space-y-1", message.role === "user" ? "items-end" : "items-start")}>
              <div className={cn(
                "rounded-2xl px-4 py-2.5 text-sm",
                message.role === "user"
                  ? "bg-white/[0.06] text-white rounded-br-sm"
                  : "glass rounded-bl-sm"
              )}>
                {message.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <UserMessageContent content={message.content} />
                )}

              {/* Generative UI cards from tool invocations */}
              {message.role === "assistant" && message.toolInvocations && message.toolInvocations.map((inv) =>
                inv.state === "result" ? (
                  <ToolResultRenderer key={inv.toolCallId} toolName={inv.toolName} result={inv.result} />
                ) : null
              )}
              </div>

              {message.role === "assistant" && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => copyMessage(message.content, message.id)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
                    {copiedId === message.id ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                  </button>
                  <button onClick={() => sendFeedback(message.id, 1)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-primary">
                    <ThumbsUp size={12} />
                  </button>
                  <button onClick={() => sendFeedback(message.id, -1)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive">
                    <ThumbsDown size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-bold text-background shrink-0">V</div>
            <div className="glass rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                {[0, 150, 300].map((delay) => (
                  <span key={delay} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
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
      <div className="px-4 pb-2">
        <div className="glass rounded-2xl overflow-hidden">
          <AttachmentPreview
            attachments={pendingAttachments}
            onRemove={(id) => setPendingAttachments((prev) => prev.filter((a) => a.id !== id))}
          />
          <form onSubmit={submitWithAttachments} className="flex items-end gap-2 px-3 py-2">
            {/* Attach file — use label so iOS WebKit handles the tap natively */}
            <label
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0 cursor-pointer"
              title="Attach file"
            >
              <Paperclip size={14} />
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.txt"
                className="sr-only"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </label>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={onPaste}
              placeholder="Message Vita… (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-sm placeholder:text-muted-foreground max-h-40 overflow-y-auto py-1.5"
              style={{ minHeight: "36px" }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 160) + "px";
              }}
            />

            {/* Voice recorder (push-to-record) */}
            <VoiceRecorder onRecorded={(file) => uploadFile(file)} />

            {/* Voice mode */}
            <button
              type="button"
              onClick={() => setVoiceMode(true)}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0"
              title="Voice mode"
            >
              <Mic2 size={14} />
            </button>

            {isLoading ? (
              <button type="button" onClick={stop} className="p-2 rounded-xl bg-destructive text-white shrink-0">
                <Square size={14} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && pendingAttachments.length === 0}
                className="p-2 rounded-xl bg-primary text-primary-foreground shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                <Send size={14} />
              </button>
            )}
          </form>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          Not medical advice — consult a healthcare professional before starting new programmes.
        </p>
      </div>

      {/* Voice mode overlay */}
      {voiceMode && <VoiceMode onClose={() => setVoiceMode(false)} onTranscript={handleVoiceTranscript} />}
    </div>
  );
}
