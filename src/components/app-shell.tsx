"use client"

import { usePathname } from "next/navigation"
import { useState } from "react"

import { LiveClassProvider } from "@/components/live-class-provider"
import { Sidebar } from "@/components/sidebar"
import { StudentSidebar } from "@/components/student-sidebar"
import { StudentTopBar, TeacherTopBar } from "@/components/topbar"

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
  const [collapsed, setCollapsed] = useState(false)

  const shell = (
    <div className="flex h-screen overflow-hidden bg-background">
      {isStudentArea ? <StudentSidebar collapsed={collapsed} /> : <Sidebar />}
      <main
        className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto main-scroll"
        style={{ contain: "layout style" }}
      >
        {isStudentArea ? (
          // Soft pastel ambient — cheerful, gentle blobs. Clipped to the
          // viewport so the off-screen blobs can't extend the scroll area
          // (main has `contain: layout`, which would otherwise let these
          // fixed blobs add phantom vertical/horizontal scroll).
          <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-background" />
            <div
              className="absolute -top-32 -left-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
              style={{
                background: "radial-gradient(circle, hsl(var(--c-a-500) / 0.4), transparent 70%)",
              }}
            />
            <div
              className="absolute top-1/4 -right-32 h-[28rem] w-[28rem] rounded-full opacity-35 blur-3xl"
              style={{
                background: "radial-gradient(circle, hsl(var(--c-s-500) / 0.4), transparent 70%)",
              }}
            />
            <div
              className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full opacity-30 blur-3xl"
              style={{
                background: "radial-gradient(circle, hsl(var(--c-p-500) / 0.35), transparent 70%)",
              }}
            />
          </div>
        ) : (
          // Admin — clean, minimal.
          <div className="fixed inset-0 pointer-events-none -z-10 bg-background" />
        )}
        {isStudentArea ? (
          <StudentTopBar onToggleSidebar={() => setCollapsed((c) => !c)} />
        ) : (
          !isAuthArea && <TeacherTopBar />
        )}
        {/* Grows to fill the height under the top bar so a page can `min-h-full`
            into the leftover space on tall viewports (tablets in portrait)
            instead of leaving a bottom void. Deliberately still a block, not a
            flex column: flex items with auto cross-axis margins don't stretch,
            which would collapse every `mx-auto max-w-*` page to fit-content. */}
        <div className="relative shrink-0 grow p-4 lg:p-8">{children}</div>
      </main>
    </div>
  )

  return isStudentArea ? <LiveClassProvider>{shell}</LiveClassProvider> : shell
}
