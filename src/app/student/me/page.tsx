"use client"

import {
  Bell,
  BookOpen,
  CalendarCheck,
  ChevronRight,
  CreditCard,
  History,
  LogOut,
} from "lucide-react"
import Link from "next/link"

import { DayNightSwitch } from "@/components/student-topbar"
import { useStudent } from "@/lib/use-student"

const LINKS = [
  { href: "/student/progress", label: "My Progress", hint: "Quran rounds so far", icon: BookOpen },
  { href: "/student/classes", label: "Classes", hint: "Past and live classes", icon: History },
  {
    href: "/student/attendance",
    label: "Attendance",
    hint: "Days you joined",
    icon: CalendarCheck,
  },
  {
    href: "/student/notifications",
    label: "Notifications",
    hint: "Messages from your teacher",
    icon: Bell,
  },
  { href: "/student/fees", label: "Fees", hint: "For your parents", icon: CreditCard },
]

/** The "Me" tab — profile plus the parent-facing pages that used to crowd the sidebar. */
export default function StudentMePage() {
  const { student, username } = useStudent()
  const name = student?.name || username || "Student"
  const initial = (student?.name?.[0] || username?.[0] || "?").toUpperCase()

  return (
    <div className="mx-auto w-full max-w-2xl animate-fade-in-up">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-3xl bg-primary font-heading text-[32px] font-bold text-primary-foreground">
          {initial}
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-heading text-[28px] font-bold leading-tight text-foreground">
            {name}
          </h1>
          {username && <p className="text-[14px] text-muted-foreground">@{username}</p>}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        {LINKS.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              "flex min-h-[72px] items-center gap-4 px-5 py-3 transition-colors hover:bg-[hsl(var(--surface-alt))]" +
              (i > 0 ? " border-t border-border" : "")
            }
          >
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
              <link.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-bold text-foreground">{link.label}</span>
              <span className="block text-[13px] text-muted-foreground">{link.hint}</span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {/* Phones don't have room for the day/night switch in the top bar. */}
      <div className="mt-5 flex min-h-[72px] items-center gap-4 rounded-3xl border border-border bg-card px-5 py-3 shadow-soft sm:hidden">
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-bold text-foreground">Day or night</span>
          <span className="block text-[13px] text-muted-foreground">Change how the app looks</span>
        </span>
        <DayNightSwitch />
      </div>

      <form action="/auth/signout?next=/login" method="post" className="mt-5">
        <button
          type="submit"
          className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-3xl border border-border bg-card text-[15px] font-bold text-destructive shadow-soft transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </form>
    </div>
  )
}
