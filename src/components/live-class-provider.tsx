"use client"

import { Radio } from "lucide-react"
import { useRouter } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { type NavState, useClassChannel } from "@/lib/use-class-channel"
import { useTrackStudentOnline } from "@/lib/use-online-students"
import { useStudent } from "@/lib/use-student"

type NavListener = (nav: NavState) => void
type ScrollListener = (ratio: number) => void

interface LiveClassContextValue {
  /** Is the teacher currently hosting a live class for this student? */
  live: boolean
  /** The teacher's last-known position (para/page). */
  peerNav: NavState | null
  studentId: string | null
  /** Has this student joined the live viewer (tracked as present)? */
  joined: boolean
  join: () => void
  leave: () => void
  /** Broadcast the student's position (only meaningful once joined). */
  sendNav: (nav: NavState) => void
  /** Subscribe to the teacher's nav events; returns an unsubscribe fn. */
  subscribeNav: (fn: NavListener) => () => void
  /** Subscribe to the teacher's scroll events; returns an unsubscribe fn. */
  subscribeScroll: (fn: ScrollListener) => () => void
}

const LiveClassContext = createContext<LiveClassContextValue>({
  live: false,
  peerNav: null,
  studentId: null,
  joined: false,
  join: () => {},
  leave: () => {},
  sendNav: () => {},
  subscribeNav: () => () => {},
  subscribeScroll: () => () => {},
})

export const useLiveClass = () => useContext(LiveClassContext)

/**
 * Wraps the student portal and owns the *single* class channel. Listens for the
 * teacher going live (presence). Joining flips presence tracking on so the
 * teacher sees the student; the live viewer talks through this one channel.
 */
export function LiveClassProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { student } = useStudent()
  const studentId = student?.id ?? null
  const [joined, setJoined] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)

  // Advertise this student as online (green dot in the teacher portal) for as
  // long as any student page is open.
  useTrackStudentOnline(studentId)
  const navCbs = useRef<Set<NavListener>>(new Set())
  const scrollCbs = useRef<Set<ScrollListener>>(new Set())

  // Close the live viewer once per join (dedupes explicit-end vs presence-drop).
  const closingRef = useRef(false)
  const sawLive = useRef(false)
  const endNow = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    toast("Class ended", { description: "Your teacher ended the class." })
    setJoined(false)
  }, [])

  const { live, peerNav, sendNav } = useClassChannel({
    studentId,
    role: "student",
    enabled: !!studentId,
    present: joined, // listen-only until the student joins
    onNav: (nav) => navCbs.current.forEach((fn) => fn(nav)),
    onScroll: (ratio) => scrollCbs.current.forEach((fn) => fn(ratio)),
    onEnd: endNow, // explicit "class ended" from the teacher → close immediately
  })

  const subscribeNav = useCallback((fn: NavListener) => {
    navCbs.current.add(fn)
    return () => {
      navCbs.current.delete(fn)
    }
  }, [])
  const subscribeScroll = useCallback((fn: ScrollListener) => {
    scrollCbs.current.add(fn)
    return () => {
      scrollCbs.current.delete(fn)
    }
  }, [])
  const join = useCallback(() => setJoined(true), [])
  const leave = useCallback(() => setJoined(false), [])

  // Reset the close guards on each fresh join.
  useEffect(() => {
    if (joined) {
      closingRef.current = false
      sawLive.current = false
    }
  }, [joined])

  // Fallback: teacher's presence drops while joined (crash / closed tab).
  useEffect(() => {
    if (!joined) return
    if (live) sawLive.current = true
    else if (sawLive.current) endNow()
  }, [joined, live, endNow])

  // Prominent "class is live" alert (replaces the old bottom-right toast). Opens
  // on the rising edge of `live` when not already joined; closes when the class
  // ends or the student joins.
  const wasLive = useRef(false)
  useEffect(() => {
    if (live && !wasLive.current && !joined) setAlertOpen(true)
    if (!live) setAlertOpen(false)
    wasLive.current = live
  }, [live, joined])
  useEffect(() => {
    if (joined) setAlertOpen(false)
  }, [joined])

  const joinFromAlert = useCallback(() => {
    setAlertOpen(false)
    join()
    router.push("/student/classes")
  }, [join, router])

  return (
    <LiveClassContext.Provider
      value={{
        live,
        peerNav,
        studentId,
        joined,
        join,
        leave,
        sendNav,
        subscribeNav,
        subscribeScroll,
      }}
    >
      {children}

      <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
        <DialogContent className="max-w-sm overflow-hidden rounded-[24px] border border-border bg-card p-0 text-center">
          <div className="flex flex-col items-center gap-4 px-7 pb-7 pt-9">
            <span className="relative flex h-16 w-16 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/30" />
              <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <Radio className="h-7 w-7" strokeWidth={2.25} />
              </span>
            </span>

            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live now
              </span>
              <DialogTitle className="text-xl font-bold text-foreground">
                Your class has started
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Your teacher is waiting. Join to follow along in real time.
              </DialogDescription>
            </div>

            <div className="mt-1 flex w-full flex-col gap-2">
              <Button size="lg" className="w-full text-base font-semibold" onClick={joinFromAlert}>
                Join now
              </Button>
              <button
                type="button"
                onClick={() => setAlertOpen(false)}
                className="w-full rounded-lg py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Maybe later
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </LiveClassContext.Provider>
  )
}
