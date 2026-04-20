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
    <div className="fixed bottom-20 left-4 right-4 z-40 glass rounded-2xl p-4 flex items-center gap-3 border border-white/[0.07] shadow-xl fu">
      <div className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
        <Download size={14} className="text-white/50" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">Add Vita to Home Screen</p>
        <p className="text-xs text-muted-foreground">Get the full app experience</p>
      </div>
      <button onClick={install} className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] text-white/50 hover:bg-white/[0.06] transition-colors">
        Install
      </button>
      <button onClick={() => setShow(false)} className="p-1 text-muted-foreground hover:text-foreground">
        <X size={14} />
      </button>
    </div>
  );
}
