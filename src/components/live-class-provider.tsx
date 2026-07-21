"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { useStudent } from "@/lib/use-student"
import { useClassChannel, type NavState } from "@/lib/use-class-channel"
import { toast } from "sonner"

type NavListener = (nav: NavState) => void

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
})

export const useLiveClass = () => useContext(LiveClassContext)

/**
 * Wraps the student portal and owns the *single* class channel. Listens for the
 * teacher going live (presence). Joining flips presence tracking on so the
 * teacher sees the student; the live viewer talks through this one channel.
 */
export function LiveClassProvider({ children }: { children: React.ReactNode }) {
  const { student } = useStudent()
  const studentId = student?.id ?? null
  const [joined, setJoined] = useState(false)
  const navCbs = useRef<Set<NavListener>>(new Set())

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
    onEnd: endNow, // explicit "class ended" from the teacher → close immediately
  })

  const subscribeNav = useCallback((fn: NavListener) => {
    navCbs.current.add(fn)
    return () => {
      navCbs.current.delete(fn)
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

  const wasLive = useRef(false)
  useEffect(() => {
    if (live && !wasLive.current && !joined) {
      toast("Your class is live 🟢", {
        description: "Your teacher started the class — open Classes to join.",
      })
    }
    wasLive.current = live
  }, [live, joined])

  return (
    <LiveClassContext.Provider
      value={{ live, peerNav, studentId, joined, join, leave, sendNav, subscribeNav }}
    >
      {children}
    </LiveClassContext.Provider>
  )
}
