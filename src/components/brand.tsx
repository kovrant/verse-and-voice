import { cn } from "@/lib/utils"

/**
 * The "Verse & Voice" wordmark — Baloo 2, with the ampersand as a
 * subtle feature (lighter italic, deep-teal accent by default). On colored /
 * gradient headers pass `amp="text-white/80"` so it reads against the fill.
 */
export function Brand({
  className,
  amp = "text-brand",
}: {
  className?: string
  amp?: string
}) {
  return (
    <span className={cn("font-heading font-semibold tracking-tight", className)}>
      Verse <span className={cn("font-normal italic", amp)}>&amp;</span> Voice
    </span>
  )
}
