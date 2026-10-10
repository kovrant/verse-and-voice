"use client"

import { Check, Hand, Loader2, Mic, RotateCcw, Square, Timer, Trash2, Upload } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { NamazPartPanel } from "@/components/namaz-part-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  NAMAZ_AUDIO_BUCKET,
  namazAudioPath,
  namazAudioType,
  type NamazStep,
  type NamazStepPart,
  validWordTimings,
  wordChips,
} from "@/lib/namaz"
import { CACHE_FOREVER } from "@/lib/storage"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

type Patch = Partial<
  Pick<NamazStepPart, "audio_url" | "word_timings" | "needs_review" | "review_note">
>

/**
 * One part on the teacher's Namaz audio page: record / upload / delete the
 * recording, tap the start of each word to fill `word_timings` (Space works
 * too), preview the student karaoke, and approve generated content.
 */
export function NamazAudioRow({
  step,
  part,
  onChange,
}: {
  step: NamazStep
  part: NamazStepPart
  onChange: (patch: Patch) => void
}) {
  const chips = wordChips(part.arabic_text, part.word_tr)
  const wordCount = chips?.length ?? 0
  const [busy, setBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  // Tap-to-time: `taps` while tapping, then `draft` until saved or redone.
  const [taps, setTaps] = useState<number[] | null>(null)
  const [draft, setDraft] = useState<number[] | null>(null)
  const timed = validWordTimings(part.word_timings, wordCount)

  async function save(patch: Patch) {
    const { error } = await supabase.from("namaz_step_parts").update(patch).eq("id", part.id)
    if (error) {
      toast.error(error.message)
      return false
    }
    onChange(patch)
    return true
  }

  /** Upload a new clip, point the part at it (old timings no longer fit), then drop the old file. */
  async function saveAudio(blob: Blob, fileName = "") {
    const kind = namazAudioType(blob.type, fileName)
    if (!kind) {
      toast.error("Please use an mp3, m4a or webm audio file.")
      return
    }
    setBusy(true)
    const path = `${part.id}-${Date.now().toString(36)}.${kind.ext}`
    const { error } = await supabase.storage
      .from(NAMAZ_AUDIO_BUCKET)
      .upload(path, blob, { contentType: kind.type, cacheControl: CACHE_FOREVER })
    if (error) {
      toast.error(error.message)
      setBusy(false)
      return
    }
    const old = namazAudioPath(part.audio_url)
    const { data } = supabase.storage.from(NAMAZ_AUDIO_BUCKET).getPublicUrl(path)
    if (await save({ audio_url: data.publicUrl, word_timings: null })) {
      if (old) await supabase.storage.from(NAMAZ_AUDIO_BUCKET).remove([old])
      setDraft(null)
      toast.success("Recording saved")
    }
    setBusy(false)
  }

  async function deleteAudio() {
    setBusy(true)
    const old = namazAudioPath(part.audio_url)
    if (await save({ audio_url: null, word_timings: null })) {
      if (old) await supabase.storage.from(NAMAZ_AUDIO_BUCKET).remove([old])
      setDraft(null)
    }
    setBusy(false)
  }

  async function startRecording() {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      const name = e instanceof DOMException ? e.name : ""
      toast.error(
        name === "NotFoundError"
          ? "No microphone found. Plug one in or check your system sound input."
          : name === "NotAllowedError"
            ? "Microphone blocked. Reload this page, then allow it for this site in the browser's address bar and in your system's privacy settings."
            : "Microphone not available. Use Upload file instead.",
      )
      return
    }
    const recorder = new MediaRecorder(stream)
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      setRecording(false)
      void saveAudio(new Blob(chunks, { type: recorder.mimeType }))
    }
    recorderRef.current = recorder
    recorder.start()
    setSeconds(0)
    setRecording(true)
  }

  useEffect(() => {
    if (!recording) return
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [recording])

  // Leaving mid-recording: release the microphone and drop the clip.
  useEffect(
    () => () => {
      const r = recorderRef.current
      if (r?.state !== "recording") return
      r.onstop = () => r.stream.getTracks().forEach((t) => t.stop())
      r.stop()
    },
    [],
  )

  function startTiming() {
    const audio = audioRef.current
    if (!audio) return
    setDraft(null)
    setTaps([])
    audio.currentTime = 0
    void audio.play()
  }

  function tap() {
    const audio = audioRef.current
    if (!audio || !taps) return
    const next = [...taps, audio.currentTime]
    if (next.length < wordCount) {
      setTaps(next)
      return
    }
    setTaps(null)
    setDraft(next)
  }

  // Space taps while timing (the page would otherwise scroll).
  useEffect(() => {
    if (!taps) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return
      e.preventDefault()
      tap()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  function cancelTiming() {
    audioRef.current?.pause()
    setTaps(null)
  }

  const previewTimings = draft ?? (timed ? part.word_timings : null)

  return (
    <Card className="border-border/50 shadow-soft">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {step.title}
            </p>
            <p className="font-semibold">{part.title}</p>
          </div>
          {part.needs_review && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                Needs review
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => save({ needs_review: false, review_note: null })}
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                Approve
              </Button>
            </div>
          )}
        </div>

        {part.needs_review && part.review_note && (
          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-foreground/80">
            {part.review_note}
          </p>
        )}

        {chips ? (
          <div dir="rtl" lang="ar" className="flex flex-wrap gap-x-2 gap-y-1">
            {chips.map((c, i) => (
              <span
                key={i}
                className={cn(
                  "flex flex-col items-center rounded-lg px-1",
                  taps && i === taps.length && "bg-accent/15 text-accent",
                )}
              >
                <span className="font-hadith text-xl leading-loose">{c.ar}</span>
                <span dir="ltr" lang="en" className="text-[11px] text-muted-foreground">
                  {c.tr}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <>
            {part.arabic_text && (
              <p dir="rtl" lang="ar" className="font-hadith text-xl leading-loose">
                {part.arabic_text}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {part.word_tr?.length
                ? "The transliteration no longer matches the Arabic word count, so word timing is off for this part."
                : "No transliteration yet, so word timing is off for this part."}
            </p>
          </>
        )}

        {part.action_text && (
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">What to do:</span> {part.action_text}
          </p>
        )}

        <div className="space-y-2 border-t border-border/50 pt-3">
          {part.audio_url && (
            <audio
              ref={audioRef}
              src={part.audio_url}
              controls
              preload="auto"
              className="h-10 w-full"
            />
          )}

          {taps ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="lg" className="h-12 flex-1" onClick={tap}>
                <Hand className="mr-2 h-5 w-5" />
                Tap at the start of “{chips?.[taps.length]?.tr}” ({taps.length + 1}/{wordCount}) ·
                Space
              </Button>
              <Button variant="outline" className="h-12" onClick={cancelTiming}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {recording ? (
                <Button variant="destructive" onClick={() => recorderRef.current?.stop()}>
                  <Square className="mr-1 h-4 w-4" />
                  Stop · {seconds}s
                </Button>
              ) : (
                <Button variant="outline" disabled={busy} onClick={startRecording}>
                  {busy ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className="mr-1 h-4 w-4" />
                  )}
                  {part.audio_url ? "Re-record" : "Record"}
                </Button>
              )}
              <Button
                variant="outline"
                disabled={busy || recording}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-1 h-4 w-4" />
                Upload file
              </Button>
              {part.audio_url && !recording && (
                <>
                  {wordCount > 0 && (
                    <Button variant="outline" disabled={busy} onClick={startTiming}>
                      <Timer className="mr-1 h-4 w-4" />
                      {timed ? "Re-time words" : "Time the words"}
                    </Button>
                  )}
                  {timed && !draft && (
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => save({ word_timings: null })}
                    >
                      <RotateCcw className="mr-1 h-4 w-4" />
                      Reset timings
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    disabled={busy}
                    onClick={deleteAudio}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/webm,.mp3,.m4a,.webm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void saveAudio(file, file.name)
              e.target.value = ""
            }}
          />
          {part.audio_url && wordCount > 0 && !taps && (
            <p className="text-xs text-muted-foreground">
              {draft
                ? "Check the highlight below, then save."
                : timed
                  ? "Words are timed. Students can tap a word to hear it."
                  : "Not timed yet: students see the highlight spread evenly over the clip."}
            </p>
          )}
        </div>

        {draft && (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={async () => {
                if (await save({ word_timings: draft })) {
                  setDraft(null)
                  toast.success("Timings saved")
                }
              }}
            >
              <Check className="mr-1 h-4 w-4" />
              Save timings
            </Button>
            <Button variant="outline" onClick={startTiming}>
              <RotateCcw className="mr-1 h-4 w-4" />
              Redo
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Discard
            </Button>
          </div>
        )}

        {part.audio_url && previewTimings && !taps && (
          <details
            className="rounded-xl border border-border/50 bg-secondary/20 p-3"
            open={!!draft}
          >
            <summary className="cursor-pointer text-sm font-semibold">Student preview</summary>
            <div className="pt-3">
              <NamazPartPanel
                // Remount so the preview's player picks up new timings.
                key={previewTimings.join(",")}
                step={step}
                part={{ ...part, word_timings: previewTimings }}
                onListened={() => {}}
              />
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  )
}
