"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

import {
  findNewAchievementIds,
  hasUnseenAchievements,
  readSeenAchievementIds,
  writeSeenAchievementIds,
} from "@/lib/achievements/celebrations"
import { toast } from "@/lib/toast"
import { supabase } from "@/lib/supabase"
import { useStudent } from "@/lib/use-student"

interface EarnedAchievement {
  id: string
  title: string
  issuesCertificate: boolean
}

interface AchievementCelebrationContextValue {
  hasUnseen: boolean
  markAllSeen: () => void
  refresh: () => void
}

const AchievementCelebrationContext = createContext<AchievementCelebrationContextValue>({
  hasUnseen: false,
  markAllSeen: () => {},
  refresh: () => {},
})

export function useAchievementCelebrations() {
  return useContext(AchievementCelebrationContext)
}

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function celebrateNew(earned: EarnedAchievement[], toastedRef: Set<string>) {
  const fresh = earned.filter((e) => !toastedRef.has(e.id))
  if (fresh.length === 0) return

  const certificates = fresh.filter((e) => e.issuesCertificate)
  const badges = fresh.filter((e) => !e.issuesCertificate)
  const lead = certificates[0] ?? badges[0]
  if (!lead) return

  for (const e of fresh) toastedRef.add(e.id)

  const extra = fresh.length - 1
  const description =
    extra > 0 ? `${lead.title} (+${extra} more)` : lead.title

  if (lead.issuesCertificate) {
    toast.success("Certificate earned!", { description, duration: 6000 })
  } else {
    toast.success("New trophy!", { description, duration: 5000 })
  }
}

export function AchievementCelebrationProvider({ children }: { children: ReactNode }) {
  const { student } = useStudent()
  const studentId = student?.id
  const [hasUnseen, setHasUnseen] = useState(false)
  const toastedRef = useRef(new Set<string>())
  const latestIdsRef = useRef<string[]>([])

  const loadAndCelebrate = useCallback(async () => {
    if (!studentId) return

    const { data } = await supabase
      .from("student_achievements")
      .select("id, achievement_definitions(title, issues_certificate)")
      .eq("student_id", studentId)
      .order("earned_at", { ascending: false })

    const earned: EarnedAchievement[] = []
    for (const row of data ?? []) {
      const def = unwrapJoin(row.achievement_definitions) as {
        title: string
        issues_certificate: boolean
      } | null
      if (!def) continue
      earned.push({
        id: row.id as string,
        title: def.title,
        issuesCertificate: def.issues_certificate,
      })
    }

    const currentIds = earned.map((e) => e.id)
    latestIdsRef.current = currentIds

    const seen = readSeenAchievementIds(studentId)
    const { newIds, baselineIds } = findNewAchievementIds(currentIds, seen)

    if (baselineIds) {
      writeSeenAchievementIds(studentId, baselineIds)
      setHasUnseen(false)
      return
    }

    const newEarned = earned.filter((e) => newIds.includes(e.id))
    if (newEarned.length > 0) {
      celebrateNew(newEarned, toastedRef.current)
      setHasUnseen(true)
    } else {
      setHasUnseen(hasUnseenAchievements(currentIds, readSeenAchievementIds(studentId)))
    }
  }, [studentId])

  const markAllSeen = useCallback(() => {
    if (!studentId) return
    writeSeenAchievementIds(studentId, latestIdsRef.current)
    toastedRef.current = new Set(latestIdsRef.current)
    setHasUnseen(false)
  }, [studentId])

  useEffect(() => {
    void loadAndCelebrate()
  }, [loadAndCelebrate])

  useEffect(() => {
    if (!studentId) return
    const onFocus = () => void loadAndCelebrate()
    window.addEventListener("focus", onFocus)
    const interval = window.setInterval(() => void loadAndCelebrate(), 90_000)
    return () => {
      window.removeEventListener("focus", onFocus)
      window.clearInterval(interval)
    }
  }, [studentId, loadAndCelebrate])

  return (
    <AchievementCelebrationContext.Provider
      value={{ hasUnseen, markAllSeen, refresh: loadAndCelebrate }}
    >
      {children}
    </AchievementCelebrationContext.Provider>
  )
}
