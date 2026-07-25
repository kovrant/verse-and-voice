import { cn } from "@/lib/utils"

/** A pulsing green dot indicating a student is currently online (logged in). */
export function OnlineDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex h-2.5 w-2.5", className)} title="Online now" aria-label="Online">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/70" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
    </span>
  )
}
