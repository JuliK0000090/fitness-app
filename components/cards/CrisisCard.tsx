"use client";

interface CrisisCardProps {
  message?: string;
}

export function CrisisCard({ message }: CrisisCardProps) {
  return (
    <div className="rounded-xl border-2 border-purple-500/60 bg-purple-950/30 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl" role="img" aria-label="warning">⚠️</span>
        <h3 className="text-lg font-semibold text-purple-200">We&apos;re here to help</h3>
      </div>

      {message && (
        <p className="text-sm text-purple-300">{message}</p>
      )}

      <p className="text-sm text-purple-100/80">
        If you&apos;re struggling with your relationship with food or your body, please reach out:
      </p>

      <ul className="space-y-2">
        <li className="flex flex-col">
          <span className="text-xs text-purple-400 uppercase tracking-wide font-medium">NEDA Helpline</span>
          <a
            href="tel:18009312237"
            className="text-purple-200 hover:text-white font-semibold transition-colors"
          >
            1-800-931-2237
          </a>
        </li>
        <li className="flex flex-col">
          <span className="text-xs text-purple-400 uppercase tracking-wide font-medium">Crisis Text Line</span>
          <span className="text-purple-200 font-semibold">
            Text <span className="font-bold text-white">HOME</span> to <span className="font-bold text-white">741741</span>
          </span>
        </li>
        <li className="flex flex-col">
          <span className="text-xs text-purple-400 uppercase tracking-wide font-medium">National Suicide Prevention Lifeline</span>
          <a
            href="tel:988"
            className="text-purple-200 hover:text-white font-semibold transition-colors"
          >
            988
          </a>
        </li>
      </ul>
    </div>
  );
}
