"use client"

import { Volume2 } from "lucide-react"

import type { Card, ExerciseItem } from "@/content/qaida"
import { cardAudioKeys, cardTiles, tileAudioKey } from "@/lib/qaida-live"
import { cn } from "@/lib/utils"

/**
 * One Qaida course card, big and child-facing. The live class shows the same
 * component on the teacher's and the child's screen so both see the same thing;
 * `teacher` adds the teacher notes and the exercise answers.
 *
 * Tiles: the teacher taps a piece (`onTileTap`) and `highlight` lights it on both
 * screens. Tile order is `cardTiles(card)`.
 */
export function QaidaCardView({
  card,
  hint = true,
  highlight = null,
  onTileTap,
  hasAudio,
  onPlay,
  teacher = false,
}: {
  card: Card
  /** Show the English hint (transliteration) under the Arabic. */
  hint?: boolean
  highlight?: number | null
  onTileTap?: (tile: number) => void
  /** Whether a clip exists for an audio key; speaker buttons hide without one. */
  hasAudio: (key: string) => boolean
  onPlay: (key: string) => void
  teacher?: boolean
}) {
  const tiles = cardTiles(card)
  const mainKey = cardAudioKeys(card)[0]
  const speaker =
    mainKey && hasAudio(mainKey) && card.type !== "drill" && card.type !== "exercise" ? (
      <button
        type="button"
        onClick={() => onPlay(mainKey)}
        aria-label="Listen"
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#C96F4F] text-white shadow-soft transition-transform hover:-translate-y-0.5 active:scale-[0.97]"
      >
        <Volume2 className="h-7 w-7" />
      </button>
    ) : null

  const marks = "heavy" in card ? card : null
  const ink = cn(
    marks?.heavy && "text-amber-600 dark:text-amber-400",
    marks?.qalqala && !marks.heavy && "text-sky-700 dark:text-sky-400",
    marks?.ghunna && "text-rose-600 dark:text-rose-400",
  )

  /** A tappable, highlightable piece of Arabic. */
  const Tile = ({
    i,
    children,
    className,
  }: {
    i: number
    children: React.ReactNode
    className?: string
  }) => {
    const lit = highlight === i
    const key = tileAudioKey(card, i)
    const tap = () => {
      onTileTap?.(i)
      if (!onTileTap && key && hasAudio(key)) onPlay(key)
    }
    const interactive = !!onTileTap || (!!key && hasAudio(key))
    return interactive ? (
      <button
        type="button"
        onClick={tap}
        className={cn(
          "rounded-2xl px-2 transition-all",
          lit ? "bg-amber-300/45 ring-4 ring-amber-400" : "hover:bg-black/5 dark:hover:bg-white/5",
          className,
        )}
      >
        {children}
      </button>
    ) : (
      <span
        className={cn(
          "rounded-2xl px-2",
          lit && "bg-amber-300/45 ring-4 ring-amber-400",
          className,
        )}
      >
        {children}
      </span>
    )
  }

  const arabicRow = (size: string, extra?: string) => (
    <div dir="rtl" lang="ar" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
      {tiles.map((t, i) => (
        <Tile key={i} i={i}>
          <span className={cn("font-arabic leading-[1.9]", size, ink, extra)}>{t}</span>
        </Tile>
      ))}
    </div>
  )

  const hintLine = (text: string | undefined) =>
    hint && text ? (
      <p className="text-center text-2xl font-extrabold text-[#C96F4F]">{text}</p>
    ) : null

  const teacherNote = (text: string | undefined | null) =>
    teacher && text ? (
      <p className="mx-auto max-w-2xl rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-2 text-sm text-muted-foreground">
        <b className="text-foreground">Teacher:</b> {text}
      </p>
    ) : null

  let body: React.ReactNode
  switch (card.type) {
    case "rule":
      body = (
        <>
          <h2 className="text-center font-heading text-3xl font-bold text-primary">{card.title}</h2>
          {card.example && arabicRow("text-5xl sm:text-6xl")}
          <p className="mx-auto max-w-2xl text-center text-xl leading-relaxed">{card.body}</p>
          {card.cue && (
            <p className="mx-auto max-w-2xl text-center text-base text-muted-foreground">
              <b className="text-foreground">Look for:</b> {card.cue}
            </p>
          )}
          {teacherNote(card.teacher)}
        </>
      )
      break
    case "family":
      body = (
        <>
          <h2 className="text-center font-heading text-3xl font-bold text-primary">{card.title}</h2>
          {arabicRow("text-7xl sm:text-8xl")}
          <p className="mx-auto max-w-2xl text-center text-xl leading-relaxed">{card.body}</p>
        </>
      )
      break
    case "letter":
      body = (
        <>
          <div className="flex items-center justify-center gap-6">
            {arabicRow("text-[9rem] sm:text-[11rem] leading-[1.3]")}
            {speaker}
          </div>
          <p className="text-center font-heading text-4xl font-bold text-primary">{card.name}</p>
          {hintLine(card.translit)}
          <p className="mx-auto max-w-xl text-center text-xl">{card.sound}</p>
          <p className="mx-auto max-w-xl text-center text-lg text-muted-foreground">{card.tip}</p>
        </>
      )
      break
    case "syllable":
      body = (
        <>
          <div className="flex items-center justify-center gap-6">
            {arabicRow("text-[9rem] sm:text-[11rem] leading-[1.3]")}
            {speaker}
          </div>
          {hintLine(card.translit)}
          <p className="text-center text-lg font-semibold text-muted-foreground">{card.label}</p>
        </>
      )
      break
    case "drill":
      body = (
        <>
          <h2 className="text-center font-heading text-3xl font-bold text-primary">{card.title}</h2>
          <div
            dir="rtl"
            className="mx-auto grid max-w-4xl grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2"
          >
            {card.items.map((it, i) => (
              <Tile key={i} i={i} className="flex flex-col items-center bg-card py-1 shadow-soft">
                <span
                  className={cn(
                    "font-arabic text-5xl leading-[1.7]",
                    it.heavy && "text-amber-600 dark:text-amber-400",
                    it.qalqala && !it.heavy && "text-sky-700 dark:text-sky-400",
                    it.ghunna && "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {it.arabic}
                </span>
                {hint && (
                  <span dir="ltr" className="text-sm font-bold text-[#C96F4F]">
                    {it.translit}
                  </span>
                )}
              </Tile>
            ))}
          </div>
          {card.hint && <p className="text-center text-lg text-muted-foreground">{card.hint}</p>}
        </>
      )
      break
    case "shapes":
      body = (
        <>
          <h2 className="text-center font-heading text-3xl font-bold text-primary">{card.name}</h2>
          <div dir="rtl" className="mx-auto grid max-w-3xl grid-cols-4 gap-3">
            {(["isolated", "initial", "medial", "final"] as const).map((f, i) => (
              <Tile key={f} i={i} className="flex flex-col items-center bg-card py-2 shadow-soft">
                <span className="font-arabic text-7xl leading-[1.6]">{card.forms[f]}</span>
                <span dir="ltr" className="text-sm font-semibold text-muted-foreground">
                  {f === "isolated"
                    ? "alone"
                    : f === "initial"
                      ? "start"
                      : f === "medial"
                        ? "middle"
                        : "end"}
                </span>
              </Tile>
            ))}
          </div>
          <p className="mx-auto max-w-2xl text-center text-xl leading-relaxed">{card.body}</p>
        </>
      )
      break
    case "word":
      body = (
        <>
          <div className="flex items-center justify-center gap-6">
            {arabicRow(card.arabic.length > 14 ? "text-6xl sm:text-7xl" : "text-7xl sm:text-8xl")}
            {speaker}
          </div>
          {hintLine(card.translit)}
          {card.note && (
            <p className="mx-auto max-w-xl text-center text-xl text-muted-foreground">
              {card.note}
            </p>
          )}
        </>
      )
      break
    case "ayah":
      body = (
        <>
          <p className="text-center text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {card.sura === "fatiha" ? "Al-Fatiha" : card.sura === "ikhlas" ? "Al-Ikhlas" : "An-Nas"}{" "}
            · Ayah {card.number}
          </p>
          <div className="flex items-center justify-center gap-6">
            {arabicRow("text-5xl sm:text-6xl")}
            {speaker}
          </div>
          {hintLine(card.translit)}
          <div className="flex flex-wrap justify-center gap-2">
            {card.rules.map((r) => (
              <span
                key={r}
                className="rounded-full bg-secondary/70 px-3 py-1 text-sm font-semibold"
              >
                {r}
              </span>
            ))}
          </div>
        </>
      )
      break
    case "exercise":
      body = (
        <>
          <p className="text-center text-sm font-bold uppercase tracking-widest text-sky-700 dark:text-sky-400">
            {card.kind.replace(/-/g, " ")} · {card.items.length} questions
          </p>
          <h2 className="text-center font-heading text-3xl font-bold text-primary">
            {card.prompt}
          </h2>
          <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2">
            {card.items.map((it, i) => (
              <Tile key={i} i={i} className="bg-card px-3 py-1 shadow-soft">
                <ExerciseItemView item={it} hint={hint} showAnswer={teacher} />
              </Tile>
            ))}
          </div>
          {teacher && (
            <p className="text-center text-sm text-muted-foreground">
              Run these out loud for now: tap an item to point at it. Live answers arrive in the
              next update.
            </p>
          )}
        </>
      )
      break
    case "check":
      body = (
        <>
          <p className="text-center text-sm font-bold uppercase tracking-widest text-violet-700 dark:text-violet-400">
            Unit check
          </p>
          <h2 className="text-center font-heading text-4xl font-bold text-primary">{card.title}</h2>
          <ul className="mx-auto max-w-xl space-y-2 text-xl">
            {card.items.map((it, i) => (
              <li key={i} className="flex gap-3 rounded-2xl bg-card px-4 py-2 shadow-soft">
                <b>{it.count}×</b>
                <span>
                  {it.kind.replace(/-/g, " ")}
                  {teacher && it.from && (
                    <span className="text-muted-foreground"> ({it.from})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {teacher && (
            <p className="text-center text-lg font-bold text-violet-700 dark:text-violet-400">
              Pass: {card.pass}
            </p>
          )}
        </>
      )
      break
    case "celebrate":
      body = (
        <>
          <p className="text-center text-7xl tracking-widest text-amber-500">
            {"★".repeat(card.stars)}
          </p>
          <h2 className="text-center font-heading text-5xl font-bold text-primary">{card.title}</h2>
        </>
      )
      break
  }

  return <div className="flex w-full flex-col items-center justify-center gap-6 py-6">{body}</div>
}

function ExerciseItemView({
  item,
  hint,
  showAnswer,
}: {
  item: ExerciseItem
  hint: boolean
  showAnswer: boolean
}) {
  const shown = item.arabic ?? item.shown?.join(" · ")
  const answer = Array.isArray(item.answer) ? item.answer.join(" ") : item.answer
  return (
    <span className="flex flex-col items-center">
      {shown ? (
        <span dir="rtl" lang="ar" className="font-arabic text-4xl leading-[1.8]">
          {shown}
        </span>
      ) : item.ask ? (
        <span className="text-lg font-semibold">{item.ask}</span>
      ) : (
        <Volume2 className="my-2 h-8 w-8 text-muted-foreground" aria-label="Listen" />
      )}
      {hint && item.translit && (
        <span className="text-sm font-bold text-[#C96F4F]">{item.translit}</span>
      )}
      {showAnswer && answer && (
        <span dir="auto" className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
          {answer}
        </span>
      )}
    </span>
  )
}
