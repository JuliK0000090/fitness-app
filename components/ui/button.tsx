import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base — no scale, no shadow, no gradient, 12px radius, 150ms quiet transition
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md border text-sm font-medium whitespace-nowrap select-none transition-all duration-150 outline-none focus-visible:outline-[1.5px] focus-visible:outline-champagne focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4",
  {
    variants: {
      variant: {
        // Primary — champagne bg, navy text. The "confident" action.
        primary:
          "bg-champagne text-champagne-fg border-champagne hover:bg-champagne-soft hover:border-champagne-soft active:bg-champagne-deep",
        // Secondary — transparent, subtle border, warm text
        secondary:
          "bg-transparent text-text-primary border-border-default hover:bg-bg-surface hover:border-border-strong",
        // Ghost — text only, underline on hover
        ghost:
          "bg-transparent text-text-secondary border-transparent hover:text-text-primary hover:underline underline-offset-2",
        // Danger — terracotta stroke, terracotta text
        danger:
          "bg-transparent text-terracotta border-terracotta hover:bg-terracotta-soft",
        // Default — kept for compat with existing shadcn usage
        default:
          "bg-primary text-primary-foreground border-transparent hover:bg-primary/90",
        outline:
          "bg-transparent text-text-primary border-border-default hover:bg-bg-surface",
        destructive:
          "bg-transparent text-terracotta border-terracotta hover:bg-terracotta-soft",
        link: "bg-transparent text-text-primary border-transparent underline underline-offset-4 hover:text-champagne",
      },
      size: {
        sm: "h-7 px-3 text-xs rounded",
        md: "h-9 px-4 text-sm",
        lg: "h-11 px-6 text-body",
        default: "h-9 px-4 text-sm",
        xs: "h-6 px-2 text-xs rounded",
        icon: "size-9",
        "icon-sm": "size-7",
        "icon-xs": "size-6",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
