"use client"

import { BookMarked, Check } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { classPosition,type ClassSession } from "@/components/class-student-card"
import { getChronologicalRoundNumber, type QuranRound } from "@/components/quran-progress"
import { StudentAvatar } from "@/components/student-avatar"
import { parasCompleted } from "@/lib/achievements"
import { PARA_NAMES } from "@/lib/para-names"
import { QAIDA_PARA } from "@/lib/qaida"
import { supabase } from "@/lib/supabase"
import { cn, type Student } from "@/lib/utils"

type MapStudent = Pick<Student, "id" | "name" | "gender">

/** Where one student is right now. `para` is 0 while they're on Qaida. */
export interface StudentPosition {
  student: MapStudent
  para: number
  page: number | null
  line: number | null
  roundNum: number
  done: number[]
}

/**
 * Every reading student's current position, using the class screen's rule:
 * their latest class's end, else their active round.
 */
export function useStudentPositions() {
  const [positions, setPositions] = useState<StudentPosition[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data: students } = await supabase
        .from("students")
        .select("id, name, gender")
        .eq("status", "Reading")
        .order("name")
      const ids = (students ?? []).map((s) => s.id)
      if (ids.length === 0) {
        if (!cancelled) setPositions([])
        return
      }
      const [{ data: rounds }, { data: sessions }] = await Promise.all([
        supabase.from("quran_rounds").select("*").in("student_id", ids),
        supabase
          .from("class_sessions")
          .select(
            "id, student_id, started_at, ended_at, duration_seconds, starting_para, ending_para, ending_page, last_page, ending_line, paras_covered, memorization_revised, notes",
          )
          .in("student_id", ids)
          .order("started_at", { ascending: false })
          // ponytail: newest ~40 classes per student is plenty to find each one's latest
          .limit(ids.length * 40),
      ])
      if (cancelled) return
      const allRounds = (rounds as QuranRound[]) ?? []
      const allSessions = (sessions as (ClassSession & { student_id: string })[]) ?? []
      setPositions(
        (students as MapStudent[]).flatMap((s) => {
          const r = allRounds.filter((x) => x.student_id === s.id)
          const pos = classPosition(
            r,
            allSessions.filter((x) => x.student_id === s.id),
          )
          if (!pos.activeRound) return []
          const active = pos.activeRound
          return [
            {
              student: s,
              para: pos.para,
              page: pos.page,
              line: pos.line,
              roundNum: active.type === "quran" ? getChronologicalRoundNumber(r, active) : 0,
              done:
                active.type === "quran"
                  ? parasCompleted(active.desc_completed || 0, active.asc_completed || 0)
                  : [],
            },
          ]
        }),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return positions
}

/** "Mahad · Para 28 · Page 10 · Line 3 · Round 4" */
export function positionLabel(p: StudentPosition) {
  if (p.para === QAIDA_PARA) return `${p.student.name} · Qaida`
  return [
    p.student.name,
    `Para ${p.para}`,
    p.page ? `Page ${p.page}` : null,
    p.line ? `Line ${p.line}` : null,
    p.roundNum ? `Round ${p.roundNum}` : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

function Avatar({ p, size = 28, ring }: { p: StudentPosition; size?: number; ring?: string }) {
  return (
    <span
      className={cn(
        "relative block flex-shrink-0 overflow-hidden rounded-full ring-2",
        ring ?? "ring-card-background",
      )}
      style={{ width: size, height: size }}
    >
      <StudentAvatar
        id={p.student.id}
        name={p.student.name}
        gender={p.student.gender}
        sizes={`${size}px`}
        className="object-[50%_20%]"
        initialClassName="text-xs"
      />
    </span>
  )
}

/** Overlapping avatars, "+N" past `max`. */
export function AvatarStack({
  list,
  max = 3,
  size = 26,
}: {
  list: StudentPosition[]
  max?: number
  size?: number
}) {
  if (list.length === 0) return null
  return (
    <span className="flex items-center">
      {list.slice(0, max).map((p, i) => (
        <span key={p.student.id} className={cn(i > 0 && "-ml-2")} title={positionLabel(p)}>
          <Avatar p={p} size={size} />
        </span>
      ))}
      {list.length > max && (
        <span
          className="-ml-2 flex items-center justify-center rounded-full bg-background-gray-secondary text-[10px] font-semibold text-text-secondary ring-2 ring-card-background"
          style={{ width: size, height: size }}
        >
          +{list.length - max}
        </span>
      )}
    </span>
  )
}

/** 1 → 30 line with each student's avatar on their para; Qaida students at the start. */
export function QuranRail({ positions }: { positions: StudentPosition[] }) {
  const qaida = positions.filter((p) => p.para === QAIDA_PARA)
  const byPara = (n: number) => positions.filter((p) => p.para === n)

  return (
    <div className="no-scrollbar -mx-5 overflow-x-auto px-5">
      <div className="flex min-w-[880px] items-start gap-4">
        {qaida.length > 0 && (
          <div className="flex w-[120px] flex-shrink-0 flex-col items-start gap-2 rounded-xl bg-background-gray-primary p-2.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase text-text-tertiary">
              <BookMarked className="h-3 w-3" /> Qaida
            </span>
            <div className="flex flex-wrap gap-1.5">
              {qaida.map((p) => (
                <RailStudent key={p.student.id} p={p} />
              ))}
            </div>
          </div>
        )}
        <div className="relative grid flex-1 grid-cols-[repeat(30,minmax(0,1fr))] pt-1">
          <span
            aria-hidden
            className="absolute left-[1.66%] right-[1.66%] top-[13px] h-0.5 rounded-full bg-border-primary"
          />
          {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => {
            const here = byPara(n)
            return (
              <div key={n} className="relative flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "flex size-[26px] items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ring-4 ring-card-background",
                    here.length
                      ? "bg-primary text-primary-foreground"
                      : "border border-border-primary bg-card-background text-text-tertiary",
                  )}
                >
                  {n}
                </span>
                <div className="flex flex-col items-center gap-1">
                  {here.slice(0, 3).map((p) => (
                    <RailStudent key={p.student.id} p={p} />
                  ))}
                  {here.length > 3 && (
                    <span className="text-[10px] font-semibold text-text-tertiary">
                      +{here.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function RailStudent({ p }: { p: StudentPosition }) {
  return (
    <Link
      href={`/teacher/class?student=${p.student.id}`}
      title={positionLabel(p)}
      className="group flex flex-col items-center gap-0.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-110">
        <Avatar p={p} size={30} ring="ring-primary/20" />
      </span>
      <span className="max-w-[56px] truncate text-[10px] font-medium text-text-secondary group-hover:text-primary">
        {p.student.name}
      </span>
    </Link>
  )
}

/** One para tile: number, Arabic name, who's on it; follow mode marks done/current. */
export function ParaTile({
  n,
  uploaded,
  here,
  follow,
  onOpen,
}: {
  n: number
  uploaded: boolean
  here: StudentPosition[]
  /** The followed student, when following one. */
  follow: StudentPosition | null
  onOpen: () => void
}) {
  const name = PARA_NAMES[n - 1]
  const isDone = follow ? follow.done.includes(n) && follow.para !== n : false
  const isCurrent = follow ? follow.para === n : false
  const occupied = !follow && here.length > 0

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!uploaded}
      className={cn(
        "group relative flex min-h-[132px] flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-200",
        uploaded
          ? "hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgba(87,80,241,0.45)]"
          : "cursor-not-allowed opacity-55",
        isCurrent
          ? "border-primary bg-primary/[0.07] ring-4 ring-primary/10"
          : isDone
            ? "border-green-500/30 bg-green-500/[0.05]"
            : occupied
              ? "border-primary/30 bg-primary/[0.04]"
              : "border-card-border bg-card-background",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "text-2xl font-semibold tabular-nums leading-none",
            isCurrent || occupied ? "text-primary" : "text-text-primary",
          )}
        >
          {n}
        </span>
        {isDone && (
          <span className="flex size-5 items-center justify-center rounded-full bg-green-500/15">
            <Check className="h-3 w-3 text-green-600" strokeWidth={3} />
          </span>
        )}
        {isCurrent && (
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
        )}
      </div>

      <div className="mt-2 min-w-0">
        <p
          dir="rtl"
          className="truncate text-right font-arabic text-xl leading-9 text-text-primary"
        >
          {name.arabic}
        </p>
        <p className="truncate text-xs text-text-tertiary">{name.name}</p>
      </div>

      <div className="mt-2 flex min-h-[26px] items-center justify-between gap-2">
        {!uploaded ? (
          <span className="text-[11px] font-medium text-text-tertiary">Not uploaded</span>
        ) : isCurrent && follow ? (
          <span className="truncate text-[11px] font-semibold text-primary">
            {[follow.page && `Page ${follow.page}`, follow.line && `Line ${follow.line}`]
              .filter(Boolean)
              .join(" · ") || "Reading now"}
          </span>
        ) : (
          <AvatarStack list={follow ? [] : here} />
        )}
        {uploaded && (
          <span className="ml-auto text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Open →
          </span>
        )}
      </div>
    </button>
  )
}
