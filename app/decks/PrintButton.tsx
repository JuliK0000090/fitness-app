"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="text-caption tracking-widest uppercase px-4 py-2 rounded transition-colors hover:opacity-90"
      style={{ background: "#D4C4A8", color: "#1A1815" }}
    >
      Print / Save as PDF
    </button>
  );
}
