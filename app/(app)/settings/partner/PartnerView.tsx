"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, UserPlus, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";

type PartnerData = {
  id: string;
  partnerName: string;
  partnerEmail: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "ENDED";
  invitedAt: string;
  acceptedAt: string | null;
  encouragements: { id: string; message: string; sentAt: string }[];
};

export function PartnerView({ partner }: { partner: PartnerData | null }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);

  async function sendInvite() {
    if (!name.trim() || !email.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/partner/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerName: name.trim(), partnerEmail: email.trim() }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        toast.error(e.error || "Could not send invite");
        return;
      }
      toast.success("Invite sent.");
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  async function endPartnership() {
    if (!partner) return;
    if (!confirm("End this partnership? They'll stop receiving weekly summaries.")) return;
    setEnding(true);
    try {
      const res = await fetch(`/api/partner/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId: partner.id }),
      });
      if (res.ok) {
        toast.success("Partnership ended.");
        router.refresh();
      } else {
        toast.error("Could not end partnership");
      }
    } finally {
      setEnding(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-10 space-y-8">
      <Link href="/settings" className="inline-flex items-center gap-1 text-caption text-text-muted hover:text-text-primary">
        <ChevronLeft size={13} strokeWidth={1.5} />
        Settings
      </Link>

      <PageHeader eyebrow="Network" title="Accountability partner" rule={true} />

      <p className="text-body-sm text-text-muted">
        One person. One quiet email a week. The single biggest predictor of you sticking with this.
      </p>

      {/* No partner */}
      {!partner && (
        <div className="space-y-4 border border-border-default bg-bg-surface rounded-md p-5">
          <div className="space-y-1">
            <label className="text-caption text-text-muted">Their name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-base border border-border-default rounded px-3 py-2.5 text-body text-text-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-caption text-text-muted">Their email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg-base border border-border-default rounded px-3 py-2.5 text-body text-text-primary"
            />
          </div>
          <button
            onClick={sendInvite}
            disabled={sending || !name.trim() || !email.trim()}
            className="w-full py-2.5 rounded bg-champagne text-champagne-fg text-body-sm font-medium hover:bg-champagne-soft disabled:opacity-30 transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus size={13} strokeWidth={1.5} />
            {sending ? "Sending…" : "Send invite"}
          </button>
        </div>
      )}

      {/* Pending */}
      {partner?.status === "PENDING" && (
        <div className="space-y-3 border border-border-default bg-bg-surface rounded-md p-5">
          <div className="flex items-center gap-2">
            <Clock size={14} strokeWidth={1.5} className="text-amber" />
            <p className="text-body-sm font-medium">Waiting for {partner.partnerName}</p>
          </div>
          <p className="text-caption text-text-muted">
            Invite sent {formatDistanceToNow(new Date(partner.invitedAt), { addSuffix: true })} to {partner.partnerEmail}
          </p>
          <p className="text-caption text-text-disabled">
            Expires after 7 days. They have to click the link in their email.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={sendInvite}
              disabled={sending}
              className="text-caption text-text-muted hover:text-text-primary underline underline-offset-2"
            >
              Resend
            </button>
            <button
              onClick={endPartnership}
              disabled={ending}
              className="text-caption text-text-muted hover:text-terracotta underline underline-offset-2"
            >
              Cancel invite
            </button>
          </div>
        </div>
      )}

      {/* Accepted */}
      {partner?.status === "ACCEPTED" && (
        <div className="space-y-5">
          <div className="border border-border-default bg-bg-surface rounded-md p-5 space-y-3">
            <div>
              <p className="text-body-sm font-medium">{partner.partnerName}</p>
              <p className="text-caption text-text-muted">{partner.partnerEmail}</p>
            </div>
            <p className="text-caption text-text-disabled">
              Accepted {partner.acceptedAt && formatDistanceToNow(new Date(partner.acceptedAt), { addSuffix: true })}
            </p>
            <div className="border-t border-border-subtle pt-3 space-y-1">
              <p className="text-caption text-text-secondary font-medium">What they see</p>
              <p className="text-caption text-text-muted">
                Workouts done, habits %, streak. Never your measurements, weight, body fat, photos,
                goal text, or chat history.
              </p>
            </div>
          </div>

          {partner.encouragements.length > 0 && (
            <div className="space-y-2">
              <p className="text-label tracking-widest uppercase text-text-disabled font-sans font-medium">
                Notes from {partner.partnerName.split(" ")[0]}
              </p>
              {partner.encouragements.map((e) => (
                <div key={e.id} className="border border-border-subtle bg-bg-surface rounded-md p-4">
                  <p className="text-body-sm text-text-primary italic">&ldquo;{e.message}&rdquo;</p>
                  <p className="text-caption text-text-disabled mt-2">
                    {formatDistanceToNow(new Date(e.sentAt), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={endPartnership}
            disabled={ending}
            className="w-full py-2.5 rounded border border-border-default text-body-sm text-text-muted hover:text-terracotta hover:border-terracotta/40 transition-colors flex items-center justify-center gap-2"
          >
            <X size={13} strokeWidth={1.5} />
            End partnership
          </button>
        </div>
      )}
    </div>
  );
}
