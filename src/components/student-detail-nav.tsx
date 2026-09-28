"use client"

import {
  CreditCard,
  History,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

export type StudentView = "overview" | "history" | "account"

export interface StudentNavItem {
  id: StudentView
  label: string
  icon: LucideIcon
  hint?: string
  alert?: boolean
}

interface StudentDetailNavProps {
  active: StudentView
  onChange: (view: StudentView) => void
  items: StudentNavItem[]
}

export function StudentDetailNav({ active, onChange, items }: StudentDetailNavProps) {
  return (
    <div className="mb-5 overflow-x-auto pb-1">
      <div className="grid min-w-full grid-cols-3 gap-1.5 rounded-2xl border border-border bg-secondary/60 p-1.5">
        {items.map((item) => (
          <NavButton key={item.id} item={item} active={active === item.id} onChange={onChange} />
        ))}
      </div>
    </div>
  )
}

function NavButton({
  item,
  active,
  onChange,
}: {
  item: StudentNavItem
  active: boolean
  onChange: (view: StudentView) => void
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={() => onChange(item.id)}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors",
        active
          ? "bg-card font-semibold text-foreground shadow-soft border border-border/60"
          : "font-medium text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0", active && "text-emerald-600")} />
      <span className="flex-1 min-w-0">
        <span className="block truncate">{item.label}</span>
        {item.hint && (
          <span className="hidden sm:block truncate text-[11px] font-normal text-muted-foreground mt-0.5">
            {item.hint}
          </span>
        )}
      </span>
      {item.alert && (
        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-400" title="Needs attention" />
      )}
    </button>
  )
}

export function studentNavItems(signals: {
  lastClassLabel?: string
  sessionCount: number
  memInProgress: number
  revisingCount?: number
  unpaidThisMonth: boolean
  progressHint?: string
  achievementCount?: number
}): StudentNavItem[] {
  const activeMemTotal = signals.memInProgress + (signals.revisingCount || 0)
  const deskHintParts: string[] = []
  if (signals.progressHint) deskHintParts.push(signals.progressHint)
  if (activeMemTotal > 0) {
    deskHintParts.push(`${activeMemTotal} active lesson${activeMemTotal === 1 ? "" : "s"}`)
  } else {
    deskHintParts.push("All curriculum")
  }

  const historyHintParts: string[] = [`${signals.sessionCount} classes`]
  if (signals.achievementCount && signals.achievementCount > 0) {
    historyHintParts.push(`${signals.achievementCount} trophies`)
  } else if (signals.lastClassLabel) {
    historyHintParts.push(`Last ${signals.lastClassLabel}`)
  }

  return [
    {
      id: "overview",
      label: "Teaching Desk",
      icon: LayoutDashboard,
      hint: deskHintParts.join(" · "),
    },
    {
      id: "history",
      label: "History & Trophies",
      icon: History,
      hint: historyHintParts.join(" · "),
    },
    {
      id: "account",
      label: "Billing & Access",
      icon: CreditCard,
      hint: signals.unpaidThisMonth ? "Fee due this month" : "Fees & portal login",
      alert: signals.unpaidThisMonth,
    },
  ]
}
