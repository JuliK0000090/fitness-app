import { cn } from "@/lib/utils";
import { EditorialRule } from "./editorial-rule";

interface PageHeaderProps {
  /** Small champagne label above the title — e.g. "TUESDAY · APRIL 23" */
  eyebrow?: string;
  /** Main title — rendered in Fraunces serif */
  title: string;
  /** Optional body-lg muted subtitle below the title */
  subtitle?: string;
  /** Whether to show the editorial rule below the title (default true) */
  rule?: boolean;
  className?: string;
}

/**
 * Consistent page header used across all hero pages.
 * eyebrow → title (serif) → editorial rule → subtitle
 */
export function PageHeader({ eyebrow, title, subtitle, rule = true, className }: PageHeaderProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {eyebrow && (
        <p className="text-label tracking-widest uppercase text-champagne font-sans font-medium">
          {eyebrow}
        </p>
      )}
      <h1 className="font-serif text-display-sm font-light text-text-primary">
        {title}
      </h1>
      {rule && <EditorialRule />}
      {subtitle && (
        <p className="text-body text-text-muted leading-relaxed max-w-prose">{subtitle}</p>
      )}
    </div>
  );
}
