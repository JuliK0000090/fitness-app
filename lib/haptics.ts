// Haptic feedback via Vibration API
export function haptic(pattern: "light" | "medium" | "heavy" | "success" | "error" = "light") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;

  const patterns = {
    light: [10],
    medium: [20],
    heavy: [40],
    success: [10, 30, 10],
    error: [50, 20, 50],
  };

  navigator.vibrate(patterns[pattern]);
}
