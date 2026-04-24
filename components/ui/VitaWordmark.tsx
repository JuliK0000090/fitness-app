import { cn } from "@/lib/utils";

interface VitaWordmarkProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZE = {
  sm:  "text-sm tracking-[0.16em]",
  md:  "text-lg tracking-[0.14em]",
  lg:  "text-2xl tracking-[0.20em]",
  xl:  "text-3xl tracking-[0.22em]",
} as const;

/**
 * Vita logotype — Fraunces Light, generous tracking, uppercase.
 * Fills with currentColor so it inherits any Tailwind text-* class.
 */
export function VitaWordmark({ className, size = "md" }: VitaWordmarkProps) {
  return (
    <span
      aria-label="Vita"
      className={cn(
        "font-serif font-light uppercase select-none",
        SIZE[size],
        className,
      )}
    >
      Vita
    </span>
  );
}
