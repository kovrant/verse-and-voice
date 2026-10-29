"use client"

import { format } from "date-fns"
import {
  Activity,
  BookOpen,
  ExternalLink,
  FileText,
  type LucideIcon,
  MousePointerClick,
  WifiOff,
} from "lucide-react"

export interface ActivityLog {
  id: string
  event_type: "page_view" | "link_click" | "click" | "para_open" | "pdf_page" | "live_class"
  path: string | null
  label: string | null
  href: string | null
  meta: Record<string, unknown> | null
  occurred_at: string
}

const EVENT_STYLES: Record<
  ActivityLog["event_type"],
  { icon: LucideIcon; tint: string; verb: string }
> = {
  page_view: {
    icon: FileText,
    tint: "bg-[rgba(59,130,246,0.10)] text-[#3B82F6]",
    verb: "Viewed page",
  },
  para_open: { icon: BookOpen, tint: "bg-[rgba(34,197,94,0.10)] text-[#22C55E]", verb: "Opened" },
  pdf_page: {
    icon: FileText,
    tint: "bg-[rgba(249,115,22,0.10)] text-[#F97316]",
    verb: "Turned to",
  },
  live_class: { icon: WifiOff, tint: "bg-destructive/10 text-destructive", verb: "Live class" },
  link_click: {
    icon: ExternalLink,
    tint: "bg-[rgba(168,85,247,0.10)] text-[#A855F7]",
    verb: "Clicked link",
  },
  click: {
    icon: MousePointerClick,
    tint: "bg-background-gray-secondary text-icon-secondary",
    verb: "Clicked",
  },
}

function activityPrimaryText(log: ActivityLog): string {
  const style = EVENT_STYLES[log.event_type]
  const detail = log.label || log.href || log.path || "—"
  return `${style.verb} ${detail}`.trim()
}

export function ActivityFeed({ logs, loading }: { logs: ActivityLog[]; loading: boolean }) {
  if (loading && logs.length === 0) {
    return (
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-14 shimmer rounded-lg" />
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-background-gray-secondary">
          <Activity className="h-6 w-6 text-icon-secondary" />
        </div>
        <p className="font-medium text-text-primary mb-1">No activity yet</p>
        <p className="text-sm text-text-tertiary">
          Clicks and page opens will appear here once the student uses the portal.
        </p>
      </div>
    )
  }

  // Group by calendar day for a scannable timeline (descending: newest first).
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  )
  const groups: { day: string; items: ActivityLog[] }[] = []
  for (const log of sortedLogs) {
    const day = format(new Date(log.occurred_at), "EEEE, MMM d, yyyy")
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.items.push(log)
    else groups.push({ day, items: [log] })
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.day}>
          <p className="text-xs font-medium uppercase text-text-tertiary mb-2 px-1">{group.day}</p>
          <div className="bg-card-background rounded-xl border border-card-border overflow-hidden">
            {group.items.map((log, i) => {
              const style = EVENT_STYLES[log.event_type]
              const Icon = style.icon
              return (
                <div
                  key={log.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < group.items.length - 1 ? "border-b border-border-primary" : ""
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${style.tint}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {activityPrimaryText(log)}
                    </p>
                    {log.path && (
                      <p className="text-[11px] text-text-tertiary truncate">{log.path}</p>
                    )}
                  </div>
                  <span
                    className="text-xs text-text-tertiary flex-shrink-0 tabular-nums"
                    title={format(new Date(log.occurred_at), "MMM d, yyyy h:mm:ss a")}
                  >
                    {format(new Date(log.occurred_at), "h:mm a")}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
