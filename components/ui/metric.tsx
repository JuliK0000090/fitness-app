import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricProps {
  /** The value to display — will be rendered as-is (pre-format if needed) */
  value: string | number;
  /** Label above the number, uppercase */
  label: string;
  /** Optional unit displayed after the value in smaller text */
  unit?: string;
  /** Optional trend direction with delta label */
  trend?: {
    direction: "up" | "down" | "flat";
    label: string;
    /** Whether up is positive (default true) */
    upIsGood?: boolean;
  };
  /** Size variant */
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * THE hero number component — makes Vita feel editorial.
 * Large Fraunces serif headline, uppercase label above, optional trend.
 */
export function Metric({ value, label, unit, trend, size = "md", className }: MetricProps) {
  const numSize = {
    sm: "text-display-sm",
    md: "text-display-md",
    lg: "text-display-lg",
  }[size];

  const trendColor = trend
    ? trend.direction === "flat"
      ? "text-text-muted"
      : trend.direction === "up"
      ? (trend.upIsGood !== false ? "text-sage" : "text-terracotta")
      : (trend.upIsGood !== false ? "text-terracotta" : "text-sage")
    : "";

  const TrendIcon =
    trend?.direction === "up"
      ? TrendingUp
      : trend?.direction === "down"
      ? TrendingDown
      : Minus;

  return (
    <div className={cn("space-y-0.5", className)}>
      {/* Label — uppercase, text-label size, champagne */}
      <p className="text-label tracking-widest uppercase text-champagne font-medium font-sans">
        {label}
      </p>

      {/* Number — large serif */}
      <div className="flex items-baseline gap-2">
        <span className={cn("font-serif font-light text-text-primary tabular-nums", numSize)}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {unit && (
          <span className="text-body-sm text-text-muted font-sans">{unit}</span>
        )}
      </div>

      {/* Trend */}
      {trend && (
        <div className={cn("flex items-center gap-1 text-body-sm", trendColor)}>
          <TrendIcon size={12} strokeWidth={1.5} />
          <span>{trend.label}</span>
        </div>
      )}
    </div>
  );
}
