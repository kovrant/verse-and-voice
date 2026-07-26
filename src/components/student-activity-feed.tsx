"use client"

import { format } from "date-fns"
import {
  Activity,
  BookOpen,
  ExternalLink,
  FileText,
  MousePointerClick,
  type LucideIcon,
} from "lucide-react"

export interface ActivityLog {
  id: string
  event_type: "page_view" | "link_click" | "click" | "para_open" | "pdf_page"
  path: string | null
  label: string | null
  href: string | null
  meta: Record<string, unknown> | null
  occurred_at: string
}

const EVENT_STYLES: Record<ActivityLog["event_type"], { icon: LucideIcon; tint: string; verb: string }> =
  {
    page_view: { icon: FileText, tint: "text-blue-400 bg-blue-500/10", verb: "Viewed page" },
    para_open: { icon: BookOpen, tint: "text-emerald-400 bg-emerald-500/10", verb: "Opened" },
    pdf_page: { icon: FileText, tint: "text-amber-400 bg-amber-500/10", verb: "Turned to" },
    link_click: {
      icon: ExternalLink,
      tint: "text-purple-400 bg-purple-500/10",
      verb: "Clicked link",
    },
    click: { icon: MousePointerClick, tint: "text-muted-foreground bg-secondary", verb: "Clicked" },
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
          <div key={i} className="h-14 shimmer rounded-xl" />
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="py-16 text-center bg-card rounded-[16px] border border-border">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/40">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <p className="text-base font-semibold text-foreground mb-1">No activity yet</p>
        <p className="text-sm text-muted-foreground">
          Clicks and page opens will appear here once the student uses the portal.
        </p>
      </div>
    )
  }

  // Group by calendar day for a scannable timeline.
  const groups: { day: string; items: ActivityLog[] }[] = []
  for (const log of logs) {
    const day = format(new Date(log.occurred_at), "EEEE, MMM d, yyyy")
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.items.push(log)
    else groups.push({ day, items: [log] })
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.day}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            {group.day}
          </p>
          <div className="bg-card rounded-[16px] border border-border overflow-hidden">
            {group.items.map((log, i) => {
              const style = EVENT_STYLES[log.event_type]
              const Icon = style.icon
              return (
                <div
                  key={log.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < group.items.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${style.tint}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {activityPrimaryText(log)}
                    </p>
                    {log.path && (
                      <p className="text-[11px] text-muted-foreground truncate">{log.path}</p>
                    )}
                  </div>
                  <span
                    className="text-[11px] text-muted-foreground flex-shrink-0 tabular-nums"
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
