"use client"

import { usePathname } from "next/navigation"

import { AchievementCelebrationProvider } from "@/components/achievement-celebration-provider"
import { LiveClassProvider } from "@/components/live-class-provider"
import { Sidebar } from "@/components/sidebar"
import { StudentBackdrop } from "@/components/student-backdrop"
import { StudentTabBar } from "@/components/student-tab-bar"
import { StudentTopBar } from "@/components/student-topbar"
import { TeacherTopBar } from "@/components/topbar"

/**
 * Chooses the navigation shell + ambient background by route. The student
 * portal (/student/**) gets a playful pastel shell; everything else keeps the
 * teacher shell. Login pages hide both sidebars (each returns null there).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isStudentArea = pathname === "/student" || pathname.startsWith("/student/")
  // Auth/entry pages hide the chrome (matches Sidebar returning null there).
  const isAuthArea = pathname === "/login" || pathname === "/admin"

  const shell = (
    // Student: `isolate` (no bg) so the backdrop's -z-10 paints behind this
    // shell but in front of the page root. The backdrop must live out here, not
    // inside <main>: main's `contain: layout` would make `fixed` pin to main
    // and scroll away after one screen.
    <div
      className={
        isStudentArea
          ? "relative isolate flex h-screen overflow-hidden"
          : "flex h-screen overflow-hidden bg-background"
      }
    >
      {isStudentArea && <StudentBackdrop />}
      {isStudentArea ? <StudentTabBar /> : <Sidebar />}
      <main
        className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto main-scroll"
        style={{ contain: "layout style" }}
      >
        {!isStudentArea && (
          // Admin — clean, minimal.
          <div className="fixed inset-0 pointer-events-none -z-10 bg-background" />
        )}
        {isStudentArea ? <StudentTopBar /> : !isAuthArea && <TeacherTopBar />}
        {/* Grows to fill the height under the top bar so a page can `min-h-full`
            into the leftover space on tall viewports (tablets in portrait)
            instead of leaving a bottom void. Deliberately still a block, not a
            flex column: flex items with auto cross-axis margins don't stretch,
            which would collapse every `mx-auto max-w-*` page to fit-content. */}
        {/* Student: bottom padding clears the fixed tab bar below lg. */}
        <div
          className={
            isStudentArea
              ? "relative shrink-0 grow p-4 pb-28 lg:p-8"
              : "relative shrink-0 grow p-4 lg:p-8"
          }
        >
          {children}
        </div>
      </main>
    </div>
  )

  return isStudentArea ? (
    <LiveClassProvider>
      <AchievementCelebrationProvider>{shell}</AchievementCelebrationProvider>
    </LiveClassProvider>
  ) : (
    shell
  )
}
