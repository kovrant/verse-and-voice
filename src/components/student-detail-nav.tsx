"use client"

import {
  CreditCard,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  Trophy,
  UserRound,
  Video,
} from "lucide-react"

import { cn } from "@/lib/utils"

export type StudentView = "profile" | "overview" | "sessions" | "trophies" | "report" | "account"

export interface StudentNavItem {
  id: StudentView
  label: string
  description: string
  icon: LucideIcon
  count?: number
  alert?: boolean
}

interface StudentDetailNavProps {
  active: StudentView
  onChange: (view: StudentView) => void
  items: StudentNavItem[]
}

/**
 * Student page sections, after NextAdmin's profile page: a left column of
 * icon tiles with a title + description (lg+), a sideways-scrolling row below.
 */
export function StudentDetailNav({ active, onChange, items }: StudentDetailNavProps) {
  return (
    <nav
      aria-label="Student sections"
      className="no-scrollbar flex gap-2 overflow-x-auto border-b border-card-border px-3 py-3 lg:w-[300px] lg:flex-shrink-0 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:py-6"
    >
      {items.map((item) => {
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-shrink-0 items-center gap-3 rounded-xl p-2 text-left transition-colors lg:w-full lg:items-start",
              isActive ? "bg-background-gray-secondary_alt" : "hover:bg-background-gray-primary",
            )}
          >
            <span
              className={cn(
                "flex size-9 flex-shrink-0 items-center justify-center rounded-lg border border-border-secondary-alt bg-background-gray-secondary_alt lg:size-11",
                isActive ? "text-primary" : "text-icon-secondary",
              )}
            >
              <item.icon className="h-5 w-5" />
            </span>
            <span className="flex min-w-0 flex-col items-start gap-1 pr-1">
              <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-text-primary">
                {item.label}
                {typeof item.count === "number" && (
                  <span className="font-medium tabular-nums text-text-tertiary">
                    ({item.count})
                  </span>
                )}
                {item.alert && (
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-400"
                    title="Fee unpaid this month"
                  />
                )}
              </span>
              <span className="hidden text-xs text-text-tertiary lg:block">{item.description}</span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}

export function studentNavItems(signals: {
  sessionCount: number
  unpaidThisMonth: boolean
  achievementCount?: number
}): StudentNavItem[] {
  return [
    {
      id: "overview",
      label: "Overview",
      description: "Rounds, memorization & revision",
      icon: LayoutDashboard,
    },
    {
      id: "profile",
      label: "Profile",
      description: "Personal details, schedule & portal access",
      icon: UserRound,
    },
    {
      id: "sessions",
      label: "Sessions",
      description: "Class history & portal activity",
      icon: Video,
      count: signals.sessionCount,
    },
    {
      id: "trophies",
      label: "Trophies",
      description: "Badges & certificates",
      icon: Trophy,
      count: signals.achievementCount ?? 0,
    },
    {
      id: "report",
      label: "Monthly report",
      description: "Printable report for parents",
      icon: FileText,
    },
    {
      id: "account",
      label: "Fees & access",
      description: "Fee ledger & sign-in settings",
      icon: CreditCard,
      alert: signals.unpaidThisMonth,
    },
  ]
}
