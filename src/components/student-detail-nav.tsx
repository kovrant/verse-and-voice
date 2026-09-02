"use client"

import {
  Award,
  BookMarked,
  BookOpen,
  CreditCard,
  History,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

export type StudentView =
  | "overview"
  | "progress"
  | "classes"
  | "memorization"
  | "achievements"
  | "account"

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
    <>
      {/* Mobile: horizontal scroll */}
      <div className="mb-4 overflow-x-auto pb-1 lg:hidden">
        <div className="inline-flex min-w-full gap-1 rounded-2xl border border-border bg-secondary/60 p-1.5">
          {items.map((item) => (
            <NavButton key={item.id} item={item} active={active === item.id} onChange={onChange} compact />
          ))}
        </div>
      </div>

      {/* Desktop: vertical sidebar */}
      <nav className="hidden lg:block w-52 flex-shrink-0">
        <ul className="space-y-1 sticky top-4">
          {items.map((item) => (
            <li key={item.id}>
              <NavButton item={item} active={active === item.id} onChange={onChange} />
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}

function NavButton({
  item,
  active,
  onChange,
  compact,
}: {
  item: StudentNavItem
  active: boolean
  onChange: (view: StudentView) => void
  compact?: boolean
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={() => onChange(item.id)}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl text-left transition-colors",
        compact ? "whitespace-nowrap px-3 py-2 text-sm" : "px-3 py-2.5 text-sm",
        active
          ? "bg-card font-semibold text-foreground shadow-soft border border-border/60"
          : "font-medium text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0", active && "text-emerald-600")} />
      <span className="flex-1 min-w-0">
        <span className="block truncate">{item.label}</span>
        {!compact && item.hint && (
          <span className="block truncate text-[10px] font-normal text-muted-foreground mt-0.5">
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
  unpaidThisMonth: boolean
  progressHint?: string
  achievementCount?: number
}): StudentNavItem[] {
  return [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    {
      id: "progress",
      label: "Progress",
      icon: BookOpen,
      hint: signals.progressHint,
    },
    {
      id: "classes",
      label: "Classes",
      icon: History,
      hint: signals.lastClassLabel ?? `${signals.sessionCount} total`,
    },
    {
      id: "memorization",
      label: "Memorization",
      icon: BookMarked,
      hint: signals.memInProgress > 0 ? `${signals.memInProgress} in progress` : "None active",
    },
    {
      id: "achievements",
      label: "Trophies",
      icon: Award,
      hint:
        signals.achievementCount && signals.achievementCount > 0
          ? `${signals.achievementCount} earned`
          : "Badges & certificates",
    },
    {
      id: "account",
      label: "Account",
      icon: CreditCard,
      hint: signals.unpaidThisMonth ? "Fee due this month" : "Fees & portal",
      alert: signals.unpaidThisMonth,
    },
  ]
}
