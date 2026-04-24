"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CheckIcon, InfoIcon, TriangleAlertIcon, XIcon, Loader2Icon } from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CheckIcon className="size-3.5" strokeWidth={1.5} />,
        info: <InfoIcon className="size-3.5" strokeWidth={1.5} />,
        warning: <TriangleAlertIcon className="size-3.5" strokeWidth={1.5} />,
        error: <XIcon className="size-3.5" strokeWidth={1.5} />,
        loading: <Loader2Icon className="size-3.5 animate-spin" strokeWidth={1.5} />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "!bg-bg-elevated !border !border-border-subtle !rounded-md !text-text-primary !shadow-card !font-sans !text-body-sm",
          title: "!text-text-primary !text-body-sm !font-medium",
          description: "!text-text-muted !text-caption",
          icon: "!text-champagne",
          success: "!border-sage/20 [&>[data-icon]]:!text-sage",
          error: "!border-terracotta/20 [&>[data-icon]]:!text-terracotta",
          warning: "!border-amber/20 [&>[data-icon]]:!text-amber",
          actionButton: "!bg-champagne !text-champagne-fg !text-caption !font-medium !rounded",
          cancelButton: "!bg-bg-surface !text-text-muted !text-caption !rounded",
        },
      }}
      style={{
        "--border-radius": "12px",
      } as React.CSSProperties}
      {...props}
    />
  );
};

export { Toaster };
