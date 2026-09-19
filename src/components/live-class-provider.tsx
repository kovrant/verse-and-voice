"use client"

import { useRouter } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"

import { KidButton, KidModal, QuranBookIcon } from "@/components/kid-ui"
import { MoonMascot } from "@/components/student-mascot"
import { detectDevice } from "@/lib/device-detection"
import { toast } from "@/lib/toast"
import { type NavState, type PointerState, useClassChannel } from "@/lib/use-class-channel"
import { useTrackStudentOnline } from "@/lib/use-online-students"
import { useStudent } from "@/lib/use-student"

type NavListener = (nav: NavState) => void
type ScrollListener = (ratio: number) => void
type PointerListener = (pointer: PointerState | null) => void

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
  /** Broadcast the student's in-page scroll ratio (0..1). */
  sendScroll: (ratio: number) => void
  /** Broadcast a laser pointer / line highlight position on the current page. */
  sendPointer: (pointer: PointerState | null) => void
  /** Subscribe to the teacher's nav events; returns an unsubscribe fn. */
  subscribeNav: (fn: NavListener) => () => void
  /** Subscribe to the teacher's scroll events; returns an unsubscribe fn. */
  subscribeScroll: (fn: ScrollListener) => () => void
  /** Subscribe to the teacher's pointer events; returns an unsubscribe fn. */
  subscribePointer: (fn: PointerListener) => () => void
}

const LiveClassContext = createContext<LiveClassContextValue>({
  live: false,
  peerNav: null,
  studentId: null,
  joined: false,
  join: () => {},
  leave: () => {},
  sendNav: () => {},
  sendScroll: () => {},
  sendPointer: () => {},
  subscribeNav: () => () => {},
  subscribeScroll: () => () => {},
  subscribePointer: () => () => {},
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
  const [deviceInfo] = useState(() => (typeof window !== "undefined" ? detectDevice() : null))

  // Advertise this student as online (green dot in the teacher portal) for as
  // long as any student page is open.
  useTrackStudentOnline(studentId)
  const navCbs = useRef<Set<NavListener>>(new Set())
  const scrollCbs = useRef<Set<ScrollListener>>(new Set())
  const pointerCbs = useRef<Set<PointerListener>>(new Set())

  // Close the live viewer once per join (dedupes explicit-end vs presence-drop).
  const closingRef = useRef(false)
  const sawLive = useRef(false)
  const endNow = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    toast("Class ended", { description: "Your teacher ended the class." })
    setJoined(false)
  }, [])

  const { live, peerNav, sendNav, sendScroll, sendPointer } = useClassChannel({
    studentId,
    role: "student",
    deviceInfo,
    enabled: !!studentId,
    present: joined, // listen-only until the student joins
    onNav: (nav) => navCbs.current.forEach((fn) => fn(nav)),
    onScroll: (ratio) => scrollCbs.current.forEach((fn) => fn(ratio)),
    onPointer: (pointer) => pointerCbs.current.forEach((fn) => fn(pointer)),
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
  const subscribePointer = useCallback((fn: PointerListener) => {
    pointerCbs.current.add(fn)
    return () => {
      pointerCbs.current.delete(fn)
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

  // Fallback: teacher's presence drops while joined (crash / closed tab / ended).
  useEffect(() => {
    if (!joined) return
    if (live) {
      sawLive.current = true
    } else {
      endNow()
    }
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
        sendScroll,
        sendPointer,
        subscribeNav,
        subscribeScroll,
        subscribePointer,
      }}
    >
      {children}

      <KidModal
        open={alertOpen}
        onOpenChange={setAlertOpen}
        color="sky"
        hero={
          <span className="relative flex flex-col items-center">
            {/* Hilal, excited, inside a "broadcasting" ring */}
            <span className="relative flex h-[112px] w-[112px] items-center justify-center">
              <span className="absolute inset-2 animate-ping rounded-full bg-[hsl(var(--kid-coral)/0.35)] motion-reduce:animate-none" />
              <span className="absolute inset-0 rounded-full border-[3px] border-dashed border-[hsl(var(--kid-coral)/0.5)]" />
              <MoonMascot mood="excited" className="relative h-[96px] w-[96px]" />
            </span>
            <span className="-mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[12px] font-extrabold uppercase tracking-wider text-accent-foreground shadow-[0_3px_0_hsl(16_48%_40%)]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              Live now
            </span>
          </span>
        }
        title="Your class has started!"
        description="Your teacher is waiting for you. Join now and read along together."
      >
        <KidButton onClick={joinFromAlert} pad={<QuranBookIcon className="h-7 w-7" />}>
          Join class
        </KidButton>
        <button
          type="button"
          onClick={() => setAlertOpen(false)}
          className="rounded-full py-1.5 text-[15px] font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          Maybe later
        </button>
      </KidModal>
    </LiveClassContext.Provider>
  )
}
