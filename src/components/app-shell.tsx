"use client"

import { usePathname, useSelectedLayoutSegment } from "next/navigation"

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
  // The rendered route segment, not the URL: "/" is rewritten to /welcome for
  // visitors without a session, and this stays correct across client navigations.
  const segment = useSelectedLayoutSegment()
  const isStudentArea = pathname === "/student" || pathname.startsWith("/student/")
  // Auth/entry pages hide the chrome (matches Sidebar returning null there).
  const isAuthArea = pathname === "/login" || pathname === "/admin"

  // The public landing page draws its own sky, nav and mascot: no shell at all.
  if (segment === "welcome") return <>{children}</>

  const shell = (
    // Student: `isolate` (no bg) so the backdrop's -z-10 paints behind this
    // shell but in front of the page root.
    // Never put `contain`/`transform`/`filter` on <main>: any of them makes it
    // the containing block for `fixed` descendants, so full-screen views (Quran
    // reader, live class, Namaz) would pin to the scroll area and slide away
    // with it, leaving empty space and the tab bar on top.
    <div
      className={
        isStudentArea
          ? "relative isolate flex h-screen overflow-hidden"
          : "flex h-screen overflow-hidden bg-background print:block print:h-auto print:overflow-visible print:bg-white"
      }
    >
      {isStudentArea && <StudentBackdrop />}
      {isStudentArea ? (
        <StudentTabBar />
      ) : (
        <div className="contents print:hidden">
          <Sidebar />
        </div>
      )}
      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto main-scroll print:block print:h-auto print:overflow-visible">
        {!isStudentArea && (
          // Admin — clean, minimal.
          <div className="fixed inset-0 pointer-events-none -z-10 bg-background print:hidden" />
        )}
        {isStudentArea ? (
          <StudentTopBar />
        ) : (
          !isAuthArea && (
            <div className="contents print:hidden">
              <TeacherTopBar />
            </div>
          )
        )}
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
              : "relative shrink-0 grow p-4 lg:p-8 print:p-0"
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
