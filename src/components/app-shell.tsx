"use client"

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { StudentSidebar } from "@/components/student-sidebar"
import { StudentTopBar } from "@/components/student-topbar"

/**
 * Chooses the navigation shell + ambient background by route. The student
 * portal (/student/**) gets a playful pastel shell; everything else keeps the
 * teacher shell. Login pages hide both sidebars (each returns null there).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isStudentArea =
    pathname === "/student" || pathname.startsWith("/student/")

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {isStudentArea ? <StudentSidebar /> : <Sidebar />}
      <main
        className="flex-1 min-w-0 h-screen overflow-y-auto main-scroll"
        style={{ contain: "layout style" }}
      >
        {isStudentArea ? (
          // Soft pastel ambient — cheerful, gentle blobs.
          <>
            <div className="fixed inset-0 pointer-events-none -z-10 bg-background" />
            <div
              className="fixed -top-32 -left-24 h-96 w-96 rounded-full opacity-40 blur-3xl pointer-events-none -z-10"
              style={{ background: "radial-gradient(circle, hsl(var(--c-a-500) / 0.4), transparent 70%)" }}
            />
            <div
              className="fixed top-1/4 -right-32 h-[28rem] w-[28rem] rounded-full opacity-35 blur-3xl pointer-events-none -z-10"
              style={{ background: "radial-gradient(circle, hsl(var(--c-s-500) / 0.4), transparent 70%)" }}
            />
            <div
              className="fixed -bottom-40 left-1/3 h-96 w-96 rounded-full opacity-30 blur-3xl pointer-events-none -z-10"
              style={{ background: "radial-gradient(circle, hsl(var(--c-p-500) / 0.35), transparent 70%)" }}
            />
          </>
        ) : (
          // Admin — clean, minimal.
          <div className="fixed inset-0 pointer-events-none -z-10 bg-background" />
        )}
        {isStudentArea && <StudentTopBar />}
        <div
          className={
            isStudentArea
              ? "relative p-4 lg:p-8"
              : "relative p-4 pt-16 lg:p-8 lg:pt-8"
          }
        >
          {children}
        </div>
      </main>
    </div>
  )
}
