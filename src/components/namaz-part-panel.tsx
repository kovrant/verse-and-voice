"use client"

import { Footprints, Repeat, Snail, Square, Volume2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import {
  activeWordIndex,
  evenWordTimings,
  type NamazStep,
  type NamazStepPart,
  wordChips,
} from "@/lib/namaz"
import { cn } from "@/lib/utils"

/** Arabic size by total length, so "Allahu Akbar" is big and Al-Fatiha still reads comfortably. */
function arabicSize(text: string) {
  const n = text.length
  if (n <= 40) return "text-[40px] sm:text-[54px]"
  if (n <= 120) return "text-[30px] sm:text-[40px]"
  return "text-[26px] sm:text-[32px]"
}

const REPEAT_GAP_MS = 700

/**
 * One <audio> for the part: Listen, Slow (0.75×), ×N with a short gap, and a
 * single word when timings exist. Reports the word playing for the karaoke
 * highlight; timings fall back to an even spread over the clip.
 */
function usePartAudio(src: string | null, timings: number[] | null, wordCount: number, onEnded: () => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const runRef = useRef(0) // bumps on every new play/stop so stale callbacks bail
  const [playing, setPlaying] = useState(false)
  const [activeWord, setActiveWord] = useState(-1)
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

  const stop = useCallback(() => {
    runRef.current++
    audioRef.current?.pause()
    setPlaying(false)
    setActiveWord(-1)
  }, [])

  useEffect(() => {
    if (!src) return
    const audio = new Audio(src)
    audio.preload = "auto"
    audioRef.current = audio
    return () => {
      stop()
      audioRef.current = null
    }
  }, [src, stop])

  const timingsFor = useCallback(
    (audio: HTMLAudioElement) =>
      timings?.length === wordCount ? timings : evenWordTimings(wordCount, audio.duration),
    [timings, wordCount],
  )

  /** Play [from, until) `times` times; the rAF loop drives the highlight. */
  const run = useCallback(
    (opts: { rate?: number; times?: number; from?: number; until?: number }) => {
      const audio = audioRef.current
      if (!audio) return
      const id = ++runRef.current
      const { rate = 1, times = 1, from = 0, until } = opts
      let left = times
      audio.playbackRate = rate
      setPlaying(true)

      const tick = () => {
        if (id !== runRef.current) return
        if (until !== undefined && audio.currentTime >= until) audio.pause()
        setActiveWord(activeWordIndex(timingsFor(audio), audio.currentTime))
        if (!audio.paused) requestAnimationFrame(tick)
        else finish()
      }
      const start = () => {
        audio.currentTime = from
        void audio.play().then(
          () => requestAnimationFrame(tick),
          () => stop(),
        )
      }
      const finish = () => {
        if (id !== runRef.current) return
        left--
        if (left > 0) {
          setActiveWord(-1)
          window.setTimeout(() => id === runRef.current && start(), REPEAT_GAP_MS)
          return
        }
        setPlaying(false)
        setActiveWord(-1)
        // A single tapped word isn't "listened to the part".
        if (until === undefined) onEndedRef.current()
      }
      start()
    },
    [stop, timingsFor],
  )

  const playWord = useCallback(
    (i: number) => {
      if (!timings || timings.length !== wordCount) return
      run({ from: timings[i], until: timings[i + 1] })
    },
    [run, timings, wordCount],
  )

  return { playing, activeWord, run, stop, playWord }
}

/**
 * Everything under the picture for one part: title, repeat badge, what to do,
 * the Arabic as word chips (transliteration under each word, karaoke while the
 * teacher's recording plays), the meaning, and the audio controls.
 */
export function NamazPartPanel({
  step,
  part,
  onListened,
}: {
  step: NamazStep
  part: NamazStepPart | null
  /** The part's audio played to the end. */
  onListened: () => void
}) {
  const chips = wordChips(part?.arabic_text ?? null, part?.word_tr ?? null)
  const wordCount = chips?.length ?? 0
  const timed = !!part?.word_timings && part.word_timings.length === wordCount && wordCount > 0
  const audio = usePartAudio(part?.audio_url ?? null, part?.word_timings ?? null, wordCount, onListened)
  const repeat = part?.repeat_count ?? null

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <h2 className="font-heading text-[28px] font-bold leading-tight text-primary sm:text-[32px]">
          {step.title}
        </h2>
        {repeat && repeat > 1 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-3 py-1 text-[14px] font-extrabold text-accent">
            <Repeat className="h-4 w-4" aria-hidden />
            Say it {repeat} times
          </span>
        )}
      </div>

      {part?.action_text && (
        <p className="flex w-full max-w-xl items-center gap-3 rounded-[20px] bg-[hsl(var(--kid-rose)/0.22)] px-4 py-3 text-left text-[17px] font-bold leading-snug text-foreground">
          <Footprints className="h-6 w-6 shrink-0 text-foreground/70" aria-hidden />
          <span>
            <span className="sr-only">What to do: </span>
            {part.action_text}
          </span>
        </p>
      )}

      {chips ? (
        <div
          dir="rtl"
          lang="ar"
          className="flex w-full max-w-3xl flex-wrap justify-center gap-x-1.5 gap-y-3"
        >
          {chips.map((chip, i) => {
            const active = audio.activeWord === i
            const inner = (
              <>
                <span
                  className={cn(
                    "font-hadith font-bold leading-[1.6]",
                    arabicSize(part?.arabic_text ?? ""),
                  )}
                >
                  {chip.ar}
                </span>
                <span dir="ltr" lang="en" className="text-[13px] font-bold leading-tight sm:text-[14px]">
                  {chip.tr}
                </span>
              </>
            )
            const cls = cn(
              "flex flex-col items-center rounded-[16px] px-2 pb-1.5 transition-colors",
              active ? "bg-accent/15 text-accent" : "text-foreground [&>span:last-child]:text-foreground/70",
            )
            return timed && part?.audio_url ? (
              <button
                key={i}
                type="button"
                onClick={() => audio.playWord(i)}
                aria-label={`Play ${chip.tr}`}
                className={cn(cls, "hover:bg-accent/10")}
              >
                {inner}
              </button>
            ) : (
              <span key={i} className={cls}>
                {inner}
              </span>
            )
          })}
        </div>
      ) : part?.arabic_text ? (
        <p
          dir="rtl"
          lang="ar"
          className={cn("font-hadith font-bold leading-[1.9] text-foreground", arabicSize(part.arabic_text))}
        >
          {part.arabic_text}
        </p>
      ) : (
        <p className="text-[17px] font-semibold text-foreground/85">🌟 Practise this step with your teacher.</p>
      )}

      {part?.translation && (
        <p className="max-w-2xl border-t-[1.5px] border-[hsl(var(--kid-rose)/0.35)] pt-3 text-[16px] font-semibold leading-relaxed text-foreground/80 sm:text-[18px]">
          {part.translation}
        </p>
      )}

      {part?.audio_url && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {audio.playing ? (
            <AudioButton onClick={audio.stop} label="Stop" icon={<Square className="h-5 w-5" />} />
          ) : (
            <>
              <AudioButton
                onClick={() => audio.run({})}
                label="Listen"
                icon={<Volume2 className="h-5 w-5" />}
                strong
              />
              <AudioButton
                onClick={() => audio.run({ rate: 0.75 })}
                label="Slow"
                icon={<Snail className="h-5 w-5" />}
              />
              {repeat && repeat > 1 && (
                <AudioButton
                  onClick={() => audio.run({ times: repeat })}
                  label={`×${repeat}`}
                  aria={`Listen ${repeat} times`}
                  icon={<Repeat className="h-5 w-5" />}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function AudioButton({
  onClick,
  label,
  aria,
  icon,
  strong = false,
}: {
  onClick: () => void
  label: string
  aria?: string
  icon: React.ReactNode
  strong?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      className={cn(
        "inline-flex h-12 items-center gap-2 rounded-full border-[1.5px] px-5 font-heading text-[17px] font-bold shadow-soft transition-transform hover:-translate-y-0.5 active:scale-[0.99]",
        strong
          ? "border-accent/40 bg-accent/15 text-accent"
          : "border-border bg-card text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  )
}
