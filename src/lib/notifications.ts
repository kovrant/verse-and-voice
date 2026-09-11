// Shared helpers for the notifications feed (bell + full page).

import { differenceInCalendarDays } from "date-fns"

export type NotificationCategory =
  | "all"
  | "classes"
  | "trophies"
  | "memorization"
  | "assignments"
  | "fees"
  | "general"

export interface CategoryTabItem {
  key: NotificationCategory
  label: string
  iconName: "bell" | "video" | "trophy" | "sparkles" | "check-square" | "receipt" | "info"
}

export const NOTIFICATION_CATEGORIES: CategoryTabItem[] = [
  { key: "all", label: "All", iconName: "bell" },
  { key: "classes", label: "Classes", iconName: "video" },
  { key: "trophies", label: "Trophies", iconName: "trophy" },
  { key: "memorization", label: "Memorization", iconName: "sparkles" },
  { key: "assignments", label: "Assignments", iconName: "check-square" },
  { key: "fees", label: "Fees", iconName: "receipt" },
  { key: "general", label: "General", iconName: "info" },
]

export interface CategoryTheme {
  label: string
  badgeClass: string
  iconBgClass: string
  iconColorClass: string
  borderClass: string
  defaultActionLabel: string
}

export const CATEGORY_THEMES: Record<Exclude<NotificationCategory, "all">, CategoryTheme> = {
  classes: {
    label: "Class",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    iconBgClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    iconColorClass: "text-emerald-600 dark:text-emerald-400",
    borderClass: "border-emerald-500/20",
    defaultActionLabel: "Join Class",
  },
  trophies: {
    label: "Trophy",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
    iconBgClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    iconColorClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-500/20",
    defaultActionLabel: "View Trophy",
  },
  memorization: {
    label: "Memorization",
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20",
    iconBgClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    iconColorClass: "text-purple-600 dark:text-purple-400",
    borderClass: "border-purple-500/20",
    defaultActionLabel: "Review Now",
  },
  assignments: {
    label: "Assignment",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20",
    iconBgClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    iconColorClass: "text-blue-600 dark:text-blue-400",
    borderClass: "border-blue-500/20",
    defaultActionLabel: "Open Lesson",
  },
  fees: {
    label: "Fees",
    badgeClass: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/20",
    iconBgClass: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
    iconColorClass: "text-teal-600 dark:text-teal-400",
    borderClass: "border-teal-500/20",
    defaultActionLabel: "View Details",
  },
  general: {
    label: "General",
    badgeClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/20",
    iconBgClass: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
    iconColorClass: "text-slate-600 dark:text-slate-400",
    borderClass: "border-slate-500/20",
    defaultActionLabel: "View",
  },
}

/**
 * Determine the category of a notification based on its type and title.
 */
export function getNotificationCategory(
  type?: string | null,
  title?: string | null,
): Exclude<NotificationCategory, "all"> {
  const t = (type || "").toLowerCase().trim()
  const text = (title || "").toLowerCase().trim()

  // 1. Classes
  if (
    t === "live_class" ||
    t === "session" ||
    t === "class" ||
    t.startsWith("class_") ||
    text.includes("class") ||
    text.includes("session")
  ) {
    return "classes"
  }

  // 2. Trophies & Milestones
  if (
    t === "achievement" ||
    t === "trophy" ||
    t === "streak" ||
    t === "badge" ||
    text.includes("earned") ||
    text.includes("trophy") ||
    text.includes("badge") ||
    text.includes("milestone") ||
    text.includes("streak") ||
    text.includes("round complete")
  ) {
    return "trophies"
  }

  // 3. Memorization
  if (
    t === "memorization" ||
    t === "revision" ||
    text.includes("memoriz") ||
    text.includes("revised") ||
    text.includes("revision") ||
    text.includes("surah") ||
    text.includes("dua")
  ) {
    return "memorization"
  }

  // 4. Assignments & Tasks
  if (
    t === "assignment" ||
    t.startsWith("assignment_") ||
    t === "namaz" ||
    t === "qaida" ||
    t === "homework" ||
    text.includes("assigned") ||
    text.includes("unassigned") ||
    text.includes("namaz step") ||
    text.includes("qaida lesson") ||
    text.includes("homework") ||
    text.includes("lesson assigned")
  ) {
    return "assignments"
  }

  // 5. Fees
  if (
    t === "fee_paid" ||
    t === "fee" ||
    t === "fees" ||
    text.includes("paid") ||
    text.includes("fee") ||
    text.includes("tuition")
  ) {
    return "fees"
  }

  // Default: General
  return "general"
}

/**
 * Get action button label for a notification row.
 */
export function getNotificationActionLabel(
  type?: string | null,
  title?: string | null,
  link?: string | null,
): string | null {
  if (!link) return null
  const cat = getNotificationCategory(type, title)
  const text = (title || "").toLowerCase()

  if (cat === "classes") {
    if (text.includes("is live") || text.includes("started")) return "Join Class"
    return "View Session"
  }
  if (cat === "trophies") return "View Trophy"
  if (cat === "memorization") return "Practice Now"
  if (cat === "assignments") return "Open Lesson"
  if (cat === "fees") return "View Receipt"
  return "Open"
}

/**
 * Group a list of notification rows by smart calendar timeframes.
 */
export interface DateGroupedNotifications<T> {
  today: T[]
  yesterday: T[]
  thisWeek: T[]
  older: T[]
}

export function groupNotificationsByDate<T extends { created_at: string }>(
  items: T[],
  now: Date = new Date(),
): DateGroupedNotifications<T> {
  const groups: DateGroupedNotifications<T> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  }

  for (const item of items) {
    const itemDate = new Date(item.created_at)
    if (isNaN(itemDate.getTime())) {
      groups.older.push(item)
      continue
    }

    const diffDays = differenceInCalendarDays(now, itemDate)
    if (diffDays <= 0) {
      groups.today.push(item)
    } else if (diffDays === 1) {
      groups.yesterday.push(item)
    } else if (diffDays <= 7) {
      groups.thisWeek.push(item)
    } else {
      groups.older.push(item)
    }
  }

  return groups
}

/**
 * Strip characters that would break PostgREST's `.or(...)` ilike filter
 * (commas separate conditions; parens group them; % / _ are ilike wildcards).
 */
export function sanitizeSearchTerm(input: string): string {
  return input
    .replace(/[,()%_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * ISO timestamp for the retention boundary: notifications older than this are
 * hidden from every feed (and physically purged by the pg_cron job). Keeps the
 * client filter and the DB job on the same "2 months" definition.
 */
export function retentionCutoffIso(now: Date = new Date()): string {
  const d = new Date(now)
  d.setMonth(d.getMonth() - 2)
  return d.toISOString()
}

/**
 * How long an identical notification is suppressed for. Triggers fire from
 * component mounts and login redirects, which repeat on StrictMode double
 * mounts, back-navigation, HMR reloads and multi-tab sign-ins.
 */
export const DEDUPE_WINDOW_MINUTES = 5

/** ISO timestamp marking the start of the dedupe window (see notify.ts). */
export function dedupeCutoffIso(now: Date = new Date()): string {
  return new Date(now.getTime() - DEDUPE_WINDOW_MINUTES * 60_000).toISOString()
}
