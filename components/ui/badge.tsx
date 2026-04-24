import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // Base — small, restrained. Never SHOUTING. Uppercase only for label context.
  "inline-flex items-center gap-1 rounded border text-caption font-medium whitespace-nowrap transition-colors duration-150",
  {
    variants: {
      variant: {
        // Default — subtle elevated bg, faint border
        default: "bg-bg-elevated border-border-subtle text-text-secondary px-2 py-0.5",
        // Champagne — the accent badge
        accent: "bg-champagne/10 border-champagne/20 text-champagne px-2 py-0.5",
        // Sage green — success / connected / complete
        success: "bg-sage-soft border-sage/20 text-sage px-2 py-0.5",
        // Amber — warning / pending
        warning: "bg-amber-soft border-amber/20 text-amber px-2 py-0.5",
        // Terracotta — error / danger
        danger: "bg-terracotta-soft border-terracotta/20 text-terracotta px-2 py-0.5",
        // Outline — border only
        outline: "bg-transparent border-border-default text-text-muted px-2 py-0.5",
        // Shadcn compat
        secondary: "bg-bg-elevated border-border-subtle text-text-secondary px-2 py-0.5",
        destructive: "bg-terracotta-soft border-terracotta/20 text-terracotta px-2 py-0.5",
        ghost: "bg-transparent border-transparent text-text-muted hover:bg-bg-elevated px-2 py-0.5",
        link: "bg-transparent border-transparent text-champagne underline underline-offset-2 px-0 py-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
