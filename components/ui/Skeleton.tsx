import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-white/5", className)} />
  );
}

export function CardSkeleton() {
  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="w-8 h-8 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-2 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-1.5 w-full rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
    </div>
  );
}

export function MessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && <Skeleton className="w-7 h-7 rounded-full shrink-0" />}
      <div className={cn("space-y-1.5 max-w-[80%]", isUser ? "items-end" : "items-start")}>
        <Skeleton className={cn("h-16 rounded-2xl", isUser ? "rounded-br-sm w-48" : "rounded-bl-sm w-64")} />
      </div>
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <Skeleton className="w-8 h-8 rounded-xl mx-auto mb-2" />
      <Skeleton className="h-6 w-10 mx-auto mb-1" />
      <Skeleton className="h-2 w-16 mx-auto" />
    </div>
  );
}
