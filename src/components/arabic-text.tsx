import { cn } from "@/lib/utils"

/**
 * Renders Arabic / Quranic text in Amiri (classical Naskh), right-to-left with
 * a generous line-height for readability of the script. Use for any Arabic
 * content (verses, duas, the Bismillah). Latin UI text should not use this.
 */
export function ArabicText({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span dir="rtl" lang="ar" className={cn("font-arabic leading-loose", className)}>
      {children}
    </span>
  )
}
