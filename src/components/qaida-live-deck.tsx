"use client"

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ListTree,
  RotateCcw,
  Volume2,
  X,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { QaidaCardView } from "@/components/qaida-card-view"
import { Button } from "@/components/ui/button"
import { adjacentCards, type Card, cardById, locateCard, QAIDA_UNITS } from "@/content/qaida"
import { cardAudioKeys, type QaidaProgressStatus } from "@/lib/qaida-live"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

/** A short label for the course tree. */
function cardLabel(card: Card): string {
  switch (card.type) {
    case "rule":
    case "family":
    case "drill":
    case "check":
    case "celebrate":
      return card.title
    case "letter":
      return `${card.arabic}  ${card.name}`
    case "syllable":
    case "word":
      return `${card.arabic}  ${card.translit}`
    case "shapes":
      return `${card.arabic}  shapes`
    case "ayah":
      return `Ayah ${card.number}`
    case "exercise":
      return card.kind.replace(/-/g, " ")
  }
}

/**
 * Teacher side of a live Qaida class: the current card exactly as the child sees it
 * (plus teacher notes and answers), Prev / Next, Play, Hint, tile highlight, and the
 * per-card mastery marks. State that the child also needs (card, hint, highlight)
 * is owned by LiveSession, which broadcasts it.
 */
export function QaidaLiveDeck({
  studentId,
  cardId,
  onCardChange,
  hint,
  onHintChange,
  highlight,
  onHighlightChange,
  hasAudio,
  onPlay,
}: {
  studentId: string
  cardId: string
  onCardChange: (cardId: string) => void
  hint: boolean
  onHintChange: (hint: boolean) => void
  highlight: number | null
  onHighlightChange: (tile: number | null) => void
  hasAudio: (key: string) => boolean
  onPlay: (key: string) => void
}) {
  const card = cardById(cardId)
  const loc = locateCard(cardId)
  const { prev, next } = adjacentCards(cardId)
  const [treeOpen, setTreeOpen] = useState(true)
  const [openUnit, setOpenUnit] = useState(loc?.unit.number ?? 1)
  const [progress, setProgress] = useState<Record<string, QaidaProgressStatus>>({})

  useEffect(() => {
    if (loc) setOpenUnit(loc.unit.number)
  }, [loc])

  // This student's per-card marks (≤ 291 rows, under the PostgREST cap).
  useEffect(() => {
    let active = true
    supabase
      .from("student_qaida_progress")
      .select("card_id, status")
      .eq("student_id", studentId)
      .then(({ data }) => {
        if (!active) return
        const map: Record<string, QaidaProgressStatus> = {}
        for (const r of (data as { card_id: string; status: QaidaProgressStatus }[] | null) ?? [])
          map[r.card_id] = r.status
        setProgress(map)
      })
    return () => {
      active = false
    }
  }, [studentId])

  // Showing a card in class counts as "seen" (never downgrades a mark).
  useEffect(() => {
    if (progress[cardId]) return
    setProgress((p) => ({ ...p, [cardId]: "seen" }))
    void supabase
      .from("student_qaida_progress")
      .upsert(
        { student_id: studentId, card_id: cardId, status: "seen" },
        { onConflict: "student_id,card_id", ignoreDuplicates: true },
      )
      .then(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per card shown
  }, [cardId, studentId])

  const mark = useCallback(
    async (status: QaidaProgressStatus) => {
      const prevStatus = progress[cardId]
      setProgress((p) => ({ ...p, [cardId]: status }))
      const now = new Date().toISOString()
      const { error } = await supabase.from("student_qaida_progress").upsert(
        {
          student_id: studentId,
          card_id: cardId,
          status,
          last_seen_at: now,
          mastered_at: status === "mastered" ? now : null,
        },
        { onConflict: "student_id,card_id" },
      )
      if (error) {
        setProgress((p) => ({ ...p, [cardId]: prevStatus ?? "seen" }))
        toast.error(`Couldn't save: ${error.message}`)
      }
    },
    [cardId, progress, studentId],
  )

  // ← → move between cards (unless typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return
      if (e.key === "ArrowRight" && next) onCardChange(next.id)
      if (e.key === "ArrowLeft" && prev) onCardChange(prev.id)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, prev, onCardChange])

  if (!card || !loc) return null
  const playKey = cardAudioKeys(card).find(hasAudio)
  const status = progress[cardId]

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Where we are */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2 text-sm">
          <span className="font-semibold">
            Unit {loc.unit.number} · {loc.unit.title}
          </span>
          <span className="text-muted-foreground">
            · {loc.unit.steps[loc.stepIndex].title} · card {loc.index + 1} of {loc.total}
          </span>
          {highlight !== null && (
            <button
              type="button"
              onClick={() => onHighlightChange(null)}
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-400/30 dark:text-amber-300"
            >
              Highlight on · clear <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* The card, as the child sees it */}
        <div className="flex flex-1 items-center overflow-auto px-4">
          <QaidaCardView
            card={card}
            hint={hint}
            highlight={highlight}
            onTileTap={(i) => onHighlightChange(highlight === i ? null : i)}
            hasAudio={hasAudio}
            onPlay={onPlay}
            teacher
          />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-card px-4 py-2.5">
          <Button variant="outline" disabled={!prev} onClick={() => prev && onCardChange(prev.id)}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Prev
          </Button>
          <Button disabled={!next} onClick={() => next && onCardChange(next.id)}>
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          <div className="mx-1 h-6 w-px bg-border" />
          <Button variant="outline" disabled={!playKey} onClick={() => playKey && onPlay(playKey)}>
            <Volume2 className="mr-1 h-4 w-4" />
            {playKey ? "Play" : "No clip"}
          </Button>
          <Button variant="outline" onClick={() => onHintChange(!hint)}>
            {hint ? <EyeOff className="mr-1 h-4 w-4" /> : <Eye className="mr-1 h-4 w-4" />}
            {hint ? "Hide hint" : "Show hint"}
          </Button>
          <span className="flex-1" />
          <Button
            variant={status === "needs_work" ? "default" : "outline"}
            className={cn(status === "needs_work" && "bg-amber-600 hover:bg-amber-700")}
            onClick={() => mark("needs_work")}
          >
            <RotateCcw className="mr-1 h-4 w-4" />
            Needs work
          </Button>
          <Button
            variant={status === "mastered" ? "default" : "outline"}
            className={cn(status === "mastered" && "bg-emerald-600 hover:bg-emerald-700")}
            onClick={() => mark("mastered")}
          >
            <Check className="mr-1 h-4 w-4" />
            Mastered
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTreeOpen((o) => !o)}
            title={treeOpen ? "Hide course" : "Show course"}
          >
            <ListTree className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Course tree: jump to any card */}
      {treeOpen && (
        <nav
          aria-label="Qaida course"
          className="hidden w-72 flex-shrink-0 overflow-auto border-l border-border bg-card/60 p-2 text-sm md:block"
        >
          {QAIDA_UNITS.map((u) => {
            const cards = u.steps.flatMap((s) => s.cards)
            const done = cards.filter((c) => progress[c.id] === "mastered").length
            const open = openUnit === u.number
            return (
              <div key={u.number} className="mb-1">
                <button
                  type="button"
                  onClick={() => setOpenUnit(open ? 0 : u.number)}
                  className={cn(
                    "flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-secondary",
                    u.number === loc.unit.number && "font-semibold",
                  )}
                >
                  <span className="w-5 text-primary">{u.number}</span>
                  <span className="min-w-0 flex-1 truncate">{u.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {done}/{cards.length}
                  </span>
                </button>
                {open &&
                  u.steps.map((s) => (
                    <div key={s.title} className="ml-6 mt-1">
                      <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {s.title}
                      </p>
                      {s.cards.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => onCardChange(c.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-secondary",
                            c.id === cardId && "bg-primary/10 font-semibold text-primary",
                          )}
                        >
                          <span
                            className={cn(
                              "h-2 w-2 flex-shrink-0 rounded-full",
                              progress[c.id] === "mastered"
                                ? "bg-emerald-500"
                                : progress[c.id] === "needs_work"
                                  ? "bg-amber-500"
                                  : progress[c.id]
                                    ? "bg-muted-foreground/40"
                                    : "border border-muted-foreground/40",
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate">{cardLabel(c)}</span>
                        </button>
                      ))}
                    </div>
                  ))}
              </div>
            )
          })}
        </nav>
      )}
    </div>
  )
}
