"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/**
 * Three variants:
 *   value    — large serif number (HRV, RHR, sleep)
 *   progress — large serif number + progress bar (steps, active minutes)
 *   empty    — dimmed icon + "Connect to see this →" link
 *
 * All variants share the same outer dimensions so a 2-col / 4-col grid
 * doesn't wobble.
 */

type Common = {
  icon: LucideIcon;
  label: string;
  caption?: string;
};

type ValueTileProps = Common & {
  variant: "value";
  value: string;
};

type ProgressTileProps = Common & {
  variant: "progress";
  value: string;          // e.g. "6,847"
  current: number;
  target: number;
};

type EmptyTileProps = Common & {
  variant: "empty";
  connectHref: string;
};

export type SignalTileProps = ValueTileProps | ProgressTileProps | EmptyTileProps;

const TILE_BASE =
  "min-h-[7.5rem] rounded-md p-4 flex flex-col justify-between";

export function SignalTile(props: SignalTileProps) {
  if (props.variant === "empty") return <EmptyTile {...props} />;
  if (props.variant === "progress") return <ProgressTile {...props} />;
  return <ValueTile {...props} />;
}

function ValueTile({ icon: Icon, label, value, caption }: ValueTileProps) {
  return (
    <div className={`${TILE_BASE} border border-border-subtle bg-bg-surface`}>
      <div className="flex items-start justify-between">
        <Icon size={14} strokeWidth={1.5} className="text-text-disabled" />
        <p className="text-caption text-text-disabled tracking-wide uppercase">{label}</p>
      </div>
      <div className="space-y-1">
        <p className="font-serif text-heading-lg font-light text-text-primary leading-none tabular-nums">
          {value}
        </p>
        {caption ? <p className="text-caption text-text-muted">{caption}</p> : null}
      </div>
    </div>
  );
}

function ProgressTile({ icon: Icon, label, value, caption, current, target }: ProgressTileProps) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const done = current >= target;
  return (
    <div className={`${TILE_BASE} border border-border-subtle bg-bg-surface`}>
      <div className="flex items-start justify-between">
        <Icon size={14} strokeWidth={1.5} className="text-text-disabled" />
        <p className="text-caption text-text-disabled tracking-wide uppercase">{label}</p>
      </div>
      <div className="space-y-2">
        <p className="font-serif text-heading-lg font-light text-text-primary leading-none tabular-nums">
          {value}
        </p>
        <div className="h-px w-full bg-border-subtle rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${done ? "bg-sage" : "bg-champagne"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {caption ? <p className="text-caption text-text-muted">{caption}</p> : null}
      </div>
    </div>
  );
}

function EmptyTile({ icon: Icon, label, connectHref }: EmptyTileProps) {
  return (
    <Link
      href={connectHref as never}
      className={`${TILE_BASE} border border-dashed border-border-subtle bg-bg-base/40 group hover:border-border-default transition-colors`}
    >
      <div className="flex items-start justify-between">
        <Icon size={14} strokeWidth={1.5} className="text-text-disabled" />
        <p className="text-caption text-text-disabled tracking-wide uppercase">{label}</p>
      </div>
      <p className="text-caption text-text-disabled group-hover:text-text-muted transition-colors">
        Connect to see this →
      </p>
    </Link>
  );
}
