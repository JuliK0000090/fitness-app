"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 border border-border-default bg-bg-elevated rounded-md p-4 flex items-center gap-3 shadow-lifted">
      <div className="w-8 h-8 rounded border border-border-subtle flex items-center justify-center shrink-0">
        <Download size={13} strokeWidth={1.5} className="text-text-muted" />
      </div>
      <div className="flex-1">
        <p className="text-body-sm font-medium text-text-primary">Add Vita to Home Screen</p>
        <p className="text-caption text-text-muted">Get the full app experience</p>
      </div>
      <button
        onClick={install}
        className="text-caption px-3 py-1.5 rounded border border-border-default text-text-muted hover:border-border-strong hover:text-text-secondary transition-colors"
      >
        Install
      </button>
      <button
        onClick={() => setShow(false)}
        className="p-1 text-text-disabled hover:text-text-muted transition-colors"
        aria-label="Dismiss"
      >
        <X size={13} strokeWidth={1.5} />
      </button>
    </div>
  );
}
