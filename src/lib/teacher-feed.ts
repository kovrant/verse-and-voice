import {
  Award,
  Bell,
  CreditCard,
  GraduationCap,
  LogIn,
  type LucideIcon,
  Radio,
  Video,
} from "lucide-react"

export type FeedFilter =
  "all" | "presence" | "fee_paid" | "achievement" | "live_class" | "session" | "announcement"

export const FEED_FILTERS: { id: FeedFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "presence", label: "Online" },
  { id: "fee_paid", label: "Fees" },
  { id: "achievement", label: "Wins" },
  { id: "live_class", label: "Class" },
  { id: "session", label: "Sessions" },
  { id: "announcement", label: "News" },
]

const TYPE_META: Record<string, { icon: LucideIcon; tint: string }> = {
  presence: { icon: LogIn, tint: "text-sky-600 bg-sky-500/10" },
  // green-*, not emerald-*: the teacher palette makes emerald the indigo accent.
  fee_paid: { icon: CreditCard, tint: "text-green-600 bg-green-500/10" },
  achievement: { icon: Award, tint: "text-amber-600 bg-amber-500/10" },
  live_class: { icon: Video, tint: "text-violet-600 bg-violet-500/10" },
  session: { icon: GraduationCap, tint: "text-indigo-600 bg-indigo-500/10" },
  announcement: { icon: Bell, tint: "text-icon-secondary bg-background-gray-secondary" },
}

export function feedTypeMeta(type: string): { icon: LucideIcon; tint: string } {
  return (
    TYPE_META[type] ?? { icon: Radio, tint: "text-icon-secondary bg-background-gray-secondary" }
  )
}

export function matchesFeedFilter(type: string, filter: FeedFilter): boolean {
  if (filter === "all") return true
  return type === filter
}
