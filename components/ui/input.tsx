import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base
        "w-full min-w-0 rounded-md border bg-bg-inset px-3.5 py-2.5 text-body text-text-primary",
        "border-border-default",
        // Placeholder
        "placeholder:text-text-disabled placeholder:font-normal",
        // Focus — champagne border, no ring
        "focus:outline-none focus:border-champagne",
        // Disabled
        "disabled:pointer-events-none disabled:opacity-40",
        // File input
        "file:inline-flex file:border-0 file:bg-transparent file:text-body-sm file:font-medium file:text-text-secondary",
        // Transition
        "transition-colors duration-150",
        className
      )}
      {...props}
    />
  );
}

export { Input };
