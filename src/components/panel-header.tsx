import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** NextAdmin tinted icon chips. */
export const PANEL_TINTS = {
  indigo: "bg-[rgba(87,80,241,0.10)] text-[#5750F1]",
  green: "bg-[rgba(34,197,94,0.10)] text-[#22C55E]",
  orange: "bg-[rgba(249,115,22,0.10)] text-[#F97316]",
  purple: "bg-[rgba(168,85,247,0.10)] text-[#A855F7]",
  sky: "bg-[rgba(14,165,233,0.10)] text-[#0EA5E9]",
} as const

/** Teacher panel header: tinted icon, title + one summary line, actions on the right. */
export function PanelHeader({
  icon: Icon,
  tint,
  title,
  summary,
  actions,
}: {
  icon: LucideIcon
  tint: keyof typeof PANEL_TINTS
  title: string
  summary?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "flex size-10 flex-shrink-0 items-center justify-center rounded-lg",
            PANEL_TINTS[tint],
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold leading-6 tracking-[-0.2px] text-text-primary">{title}</p>
          {summary && <p className="truncate text-sm text-text-tertiary">{summary}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
