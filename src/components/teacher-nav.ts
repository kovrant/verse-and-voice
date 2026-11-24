import { CalendarCheck, CreditCard, Library, type LucideIcon, Settings, Users } from "lucide-react"

export interface NavTab {
  href: string
  label: string
}

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Pages grouped under this item; each gets a tab strip above it. */
  tabs?: NavTab[]
  /** Other path prefixes that light this item up (sub-pages, detail views). */
  also?: string[]
}

/**
 * The teacher portal's five sections. Pages keep their own routes; a section
 * groups them in the sidebar and shows them as tabs (see SectionTabs).
 */
export const TEACHER_NAV: NavItem[] = [
  { href: "/teacher", label: "Today", icon: CalendarCheck, also: ["/teacher/class"] },
  {
    href: "/teacher/students",
    label: "Students",
    icon: Users,
    tabs: [
      { href: "/teacher/students", label: "Students" },
      { href: "/teacher/quran", label: "Quran Map" },
    ],
  },
  {
    href: "/teacher/memorization",
    label: "Library",
    icon: Library,
    tabs: [
      { href: "/teacher/memorization", label: "Memorization" },
      { href: "/teacher/hadiths", label: "Hadiths" },
      { href: "/teacher/qaida", label: "Qaida" },
      { href: "/teacher/namaz", label: "Namaz" },
      { href: "/teacher/history", label: "Stories" },
      { href: "/teacher/quizzes", label: "Quizzes" },
      { href: "/teacher/media", label: "Quran & files" },
    ],
  },
  { href: "/teacher/fees", label: "Fees", icon: CreditCard },
  {
    href: "/teacher/notifications",
    label: "Settings",
    icon: Settings,
    tabs: [
      { href: "/teacher/notifications", label: "Notifications" },
      { href: "/teacher/ai-usage", label: "AI usage" },
    ],
  },
]

function under(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/** The section a teacher path belongs to ("/teacher" itself matches only exactly). */
export function navItemFor(pathname: string): NavItem | undefined {
  return TEACHER_NAV.find((item) =>
    [item.href, ...(item.tabs ?? []).map((t) => t.href), ...(item.also ?? [])].some((p) =>
      p === "/teacher" ? pathname === p : under(pathname, p),
    ),
  )
}

/** Tabs to show above a page: only on a tab's own page, not its detail views. */
export function tabsFor(pathname: string): NavTab[] | null {
  const tabs = navItemFor(pathname)?.tabs
  return tabs && tabs.some((t) => t.href === pathname) ? tabs : null
}
