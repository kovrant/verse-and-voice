"use client"

import { BookOpen, ChevronDown, ChevronRight, Mic, SkipForward } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { PageLoading } from "@/components/page-loading"
import { QaidaAudioRow } from "@/components/qaida-audio-row"
import { QaidaCardTile } from "@/components/qaida-card-tile"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { allCards, type Card as CourseCard, QAIDA_UNITS } from "@/content/qaida"
import {
  audioProgress,
  collectAudioKeys,
  nextMissingKey,
  QAIDA_AUDIO_SELECT,
  type QaidaAudioRow as AudioRow,
} from "@/lib/qaida-course"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type Tab = "course" | "recording"
const GROUPS: { id: string; label: string }[] = [
  { id: "letters", label: "Letters" },
  { id: "syl", label: "Sounds" },
  { id: "words", label: "Words" },
  { id: "quran", label: "Quran" },
]

/** Audio keys a card plays, for the recorded / missing dot on its tile. */
function cardAudioKeys(card: CourseCard): string[] {
  switch (card.type) {
    case "letter":
    case "syllable":
    case "word":
    case "ayah":
      return [card.audio]
    case "drill":
      return card.items.map((i) => i.audio)
    case "exercise":
      return card.items.flatMap((i) =>
        Array.isArray(i.audio) ? i.audio : i.audio ? [i.audio] : [],
      )
    default:
      return []
  }
}

/**
 * The Qaida course for the teacher: browse every unit, step and card, and record the
 * clips the cards play. Replaces the old Qaida PDF list (PDFs stay in the Media Library).
 */
export default function QaidaCoursePage() {
  const [tab, setTab] = useState<Tab>("course")
  const [rows, setRows] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [openUnit, setOpenUnit] = useState<number>(1)
  // Recording filters
  const [unitFilter, setUnitFilter] = useState<number | 0>(1)
  const [groupFilter, setGroupFilter] = useState<string | null>(null)
  const [missingOnly, setMissingOnly] = useState(false)
  const [focusKey, setFocusKey] = useState<string | null>(null)

  const keys = useMemo(() => collectAudioKeys(allCards()), [])
  const audioRows = useMemo(() => Object.keys(rows).map((audio_key) => ({ audio_key })), [rows])
  const progress = useMemo(() => audioProgress(keys, audioRows), [keys, audioRows])

  useEffect(() => {
    supabase
      .from("qaida_audio")
      .select(QAIDA_AUDIO_SELECT)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        for (const r of (data as AudioRow[]) || []) map[r.audio_key] = r.audio_url
        setRows(map)
        setLoading(false)
      })
  }, [])

  const visibleKeys = useMemo(
    () =>
      keys.filter(
        (k) =>
          (unitFilter === 0 || k.unit === unitFilter) &&
          (!groupFilter || k.group === groupFilter) &&
          (!missingOnly || !rows[k.key]),
      ),
    [keys, unitFilter, groupFilter, missingOnly, rows],
  )

  function recordNext(fromKey?: string) {
    const from = fromKey ? keys.findIndex((k) => k.key === fromKey) + 1 : 0
    const next = nextMissingKey(keys, audioRows, from)
    if (!next) {
      setFocusKey(null)
      return
    }
    // Widen the filters so the target is visible.
    setUnitFilter(next.unit)
    setGroupFilter(null)
    setMissingOnly(false)
    setFocusKey(next.key)
    setTab("recording")
  }

  function openRecording(card: CourseCard) {
    const missing = cardAudioKeys(card).find((k) => !rows[k]) ?? cardAudioKeys(card)[0]
    if (!missing) return
    const k = keys.find((x) => x.key === missing)
    if (!k) return
    setUnitFilter(k.unit)
    setGroupFilter(null)
    setMissingOnly(false)
    setFocusKey(k.key)
    setTab("recording")
  }

  if (loading) return <PageLoading variant="grid-cards" count={3} />

  const totalCards = allCards().length
  const exerciseCount = allCards().filter((c) => c.type === "exercise").length

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <BookOpen className="h-8 w-8 text-amber-600" />
            Qaida course
          </h1>
          <p className="mt-1 text-muted-foreground">
            {QAIDA_UNITS.length} units · {totalCards} cards · {exerciseCount} exercises ·{" "}
            <span className={cn(progress.done < progress.total && "text-amber-700")}>
              {progress.done} of {progress.total} clips recorded
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={tab === "course" ? "default" : "outline"}
            onClick={() => setTab("course")}
          >
            <BookOpen className="mr-1.5 h-4 w-4" />
            Course
          </Button>
          <Button
            variant={tab === "recording" ? "default" : "outline"}
            onClick={() => setTab("recording")}
          >
            <Mic className="mr-1.5 h-4 w-4" />
            Recording
          </Button>
        </div>
      </div>

      {tab === "course" ? (
        <div className="space-y-3">
          {QAIDA_UNITS.map((u) => {
            const cards = u.steps.flatMap((s) => s.cards)
            const open = openUnit === u.number
            const unitKeys = new Set(cards.flatMap(cardAudioKeys))
            const unitRecorded = [...unitKeys].filter((k) => rows[k]).length
            return (
              <Card key={u.number} className="border-border/50 shadow-soft">
                <button
                  type="button"
                  onClick={() => setOpenUnit(open ? 0 : u.number)}
                  className="flex w-full items-start gap-4 p-4 text-left"
                >
                  <span className="font-heading text-3xl font-bold leading-none text-primary">
                    {u.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-semibold">{u.title}</span>
                    <span className="block text-sm text-muted-foreground">{u.goal}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {u.steps.length} steps · {cards.length} cards ·{" "}
                      {cards.filter((c) => c.type === "exercise").length} exercises
                      {unitKeys.size > 0 && (
                        <>
                          {" · "}
                          <span className={cn(unitRecorded < unitKeys.size && "text-amber-700")}>
                            {unitRecorded}/{unitKeys.size} clips
                          </span>
                        </>
                      )}
                    </span>
                  </span>
                  {open ? (
                    <ChevronDown className="mt-1 h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="mt-1 h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                {open && (
                  <CardContent className="space-y-5 border-t border-border/50 p-4">
                    <p className="text-sm text-muted-foreground">
                      <b className="text-foreground">Why this shape:</b> {u.why}
                    </p>
                    {u.steps.map((s, i) => (
                      <section key={s.title} className="space-y-2">
                        <h3 className="text-sm font-bold">
                          <span className="text-muted-foreground">{i + 1}.</span> {s.title}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {s.cards.length} cards
                          </span>
                        </h3>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {s.cards.map((c) => {
                            const ks = cardAudioKeys(c)
                            return (
                              <QaidaCardTile
                                key={c.id}
                                card={c}
                                recorded={ks.length ? ks.every((k) => !!rows[k]) : null}
                                onRecord={() => openRecording(c)}
                              />
                            )
                          })}
                        </div>
                      </section>
                    ))}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="border-border/50 shadow-soft">
            <CardContent className="flex flex-wrap items-center gap-2 p-3">
              <select
                aria-label="Unit"
                value={unitFilter}
                onChange={(e) => setUnitFilter(Number(e.target.value))}
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option value={0}>All units</option>
                {QAIDA_UNITS.map((u) => (
                  <option key={u.number} value={u.number}>
                    Unit {u.number}: {u.title}
                  </option>
                ))}
              </select>
              {GROUPS.map((g) => (
                <Button
                  key={g.id}
                  size="sm"
                  variant={groupFilter === g.id ? "default" : "outline"}
                  onClick={() => setGroupFilter(groupFilter === g.id ? null : g.id)}
                >
                  {g.label}
                  <span className="ml-1.5 text-xs opacity-70">
                    {progress.groups[g.id]?.done ?? 0}/{progress.groups[g.id]?.total ?? 0}
                  </span>
                </Button>
              ))}
              <Button
                size="sm"
                variant={missingOnly ? "default" : "outline"}
                onClick={() => setMissingOnly((m) => !m)}
              >
                Missing only
              </Button>
              <span className="flex-1" />
              <Button
                size="sm"
                onClick={() => recordNext()}
                disabled={progress.done === progress.total}
              >
                <SkipForward className="mr-1 h-4 w-4" />
                Record next missing
              </Button>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Say each sound the way the child should hear it, short and clear. After you save a clip
            the list jumps to the next one without a recording.
          </p>

          {visibleKeys.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              {missingOnly ? "Everything here is recorded. ✨" : "No clips match these filters."}
            </p>
          ) : (
            <div className="space-y-2">
              {visibleKeys.map((k) => (
                <QaidaAudioRow
                  key={k.key}
                  audioKey={k}
                  url={rows[k.key] ?? null}
                  focused={focusKey === k.key}
                  onChange={(url) => {
                    setRows((all) => {
                      const next = { ...all }
                      if (url) next[k.key] = url
                      else delete next[k.key]
                      return next
                    })
                    if (url && focusKey === k.key) {
                      const from = keys.findIndex((x) => x.key === k.key) + 1
                      const nxt = nextMissingKey(keys, [...audioRows, { audio_key: k.key }], from)
                      setFocusKey(nxt?.key ?? null)
                      if (nxt && unitFilter !== 0 && nxt.unit !== unitFilter)
                        setUnitFilter(nxt.unit)
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
