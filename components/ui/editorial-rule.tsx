import { cn } from "@/lib/utils";

interface EditorialRuleProps {
  className?: string;
  /** Center the rule (default is left-aligned) */
  centered?: boolean;
}

/**
 * A 24px × 1px champagne horizontal rule.
 * Used as a visual breath between content sections — Aesop-style.
 */
export function EditorialRule({ className, centered }: EditorialRuleProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "block w-6 h-px bg-champagne my-5",
        centered && "mx-auto",
        className
      )}
    />
  );
}
