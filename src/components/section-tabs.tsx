"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { tabsFor } from "@/components/teacher-nav"
import { cn } from "@/lib/utils"

/** Tab strip over the pages of one sidebar section (Students, Library, Settings). */
export function SectionTabs() {
  const pathname = usePathname()
  const tabs = tabsFor(pathname)
  if (!tabs) return null

  return (
    <nav className="no-scrollbar -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-border-primary px-4 lg:mx-0 lg:px-0 print:hidden">
      {tabs.map((tab) => {
        const active = tab.href === pathname
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary",
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
