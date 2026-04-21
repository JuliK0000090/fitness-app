export function computeTrust(args: {
  sourceCount: number;
  coverageMinutes?: number;
  isOverridden: boolean;
  isGapFilled: boolean;
  hasOutlier?: boolean;
  source?: string;
}): number {
  if (args.isOverridden) return 100;

  let score = 100;

  // No sources → 0
  if (args.sourceCount === 0) return 0;

  // Multiple sources corroborating → small boost
  if (args.sourceCount > 1) score = Math.min(100, score + 3);

  // Coverage penalty (if <480 min = 8h waking coverage)
  if (args.coverageMinutes !== undefined && args.coverageMinutes < 480) {
    const ratio = args.coverageMinutes / 480;
    score = Math.round(score * (0.5 + 0.5 * ratio));
  }

  // Gap-filled → mild penalty
  if (args.isGapFilled) score = Math.min(score, 82);

  // Statistical outlier → penalty
  if (args.hasOutlier) score = Math.min(score, 70);

  return Math.max(0, Math.min(100, score));
}
