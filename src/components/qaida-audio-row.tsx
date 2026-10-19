"use client"

import { Check, Loader2, Mic, Square, Trash2, Upload } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  type AudioKey,
  QAIDA_AUDIO_BUCKET,
  qaidaAudioObjectName,
  qaidaAudioPath,
} from "@/lib/qaida-course"
import { audioUploadType, CACHE_FOREVER } from "@/lib/storage"
import { supabase } from "@/lib/supabase"
import { toast } from "@/lib/toast"
import { useAudioRecorder } from "@/lib/use-audio-recorder"
import { cn } from "@/lib/utils"

/**
 * One clip on the teacher's Qaida recording list: the Arabic to say, Record / Upload /
 * Delete, and the player. Writes `qaida_audio` and the `qaida-audio` bucket.
 */
export function QaidaAudioRow({
  audioKey: k,
  url,
  focused,
  onChange,
}: {
  audioKey: AudioKey
  url: string | null
  /** Highlighted and scrolled into view: the "record next" target. */
  focused: boolean
  onChange: (url: string | null) => void
}) {
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const { recording, seconds, start, stop } = useAudioRecorder((blob) => void saveAudio(blob))

  useEffect(() => {
    if (focused) rootRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [focused])

  async function saveAudio(blob: Blob, fileName = "") {
    const kind = audioUploadType(blob.type, fileName)
    if (!kind) {
      toast.error("Please use an mp3, m4a or webm audio file.")
      return
    }
    setBusy(true)
    const path = qaidaAudioObjectName(k.key, kind.ext)
    const up = await supabase.storage
      .from(QAIDA_AUDIO_BUCKET)
      .upload(path, blob, { contentType: kind.type, cacheControl: CACHE_FOREVER })
    if (up.error) {
      toast.error(up.error.message)
      setBusy(false)
      return
    }
    const { data } = supabase.storage.from(QAIDA_AUDIO_BUCKET).getPublicUrl(path)
    const { error } = await supabase
      .from("qaida_audio")
      .upsert({
        audio_key: k.key,
        audio_url: data.publicUrl,
        recorded_at: new Date().toISOString(),
      })
    if (error) {
      toast.error(error.message)
      await supabase.storage.from(QAIDA_AUDIO_BUCKET).remove([path])
      setBusy(false)
      return
    }
    const old = qaidaAudioPath(url)
    if (old) await supabase.storage.from(QAIDA_AUDIO_BUCKET).remove([old])
    onChange(data.publicUrl)
    toast.success(`Saved ${k.translit || k.arabic}`)
    setBusy(false)
  }

  async function deleteAudio() {
    setBusy(true)
    const { error } = await supabase.from("qaida_audio").delete().eq("audio_key", k.key)
    if (error) {
      toast.error(error.message)
    } else {
      const old = qaidaAudioPath(url)
      if (old) await supabase.storage.from(QAIDA_AUDIO_BUCKET).remove([old])
      onChange(null)
    }
    setBusy(false)
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3 transition-colors",
        focused ? "border-primary ring-2 ring-primary/30" : "border-border/50",
        url && "bg-emerald-500/[0.04]",
      )}
    >
      <div className="flex min-w-[9rem] items-baseline gap-3">
        <span dir="rtl" lang="ar" className="font-arabic text-3xl leading-[1.6]">
          {k.arabic}
        </span>
        <span className="text-sm font-semibold text-primary">{k.translit}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-xs text-muted-foreground">
        <span className="truncate">
          Unit {k.unit} · {k.cardIds.length} {k.cardIds.length === 1 ? "card" : "cards"} ·{" "}
          <code className="text-[11px]">{k.key}</code>
        </span>
        {url ? (
          <audio src={url} controls preload="none" className="h-8 w-full max-w-xs" />
        ) : (
          <span className="italic">Not recorded yet</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {recording ? (
          <Button size="sm" variant="destructive" onClick={stop}>
            <Square className="mr-1 h-4 w-4" />
            Stop · {seconds}s
          </Button>
        ) : (
          <Button size="sm" variant={url ? "outline" : "default"} disabled={busy} onClick={start}>
            {busy ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : url ? (
              <Mic className="mr-1 h-4 w-4" />
            ) : (
              <Mic className="mr-1 h-4 w-4" />
            )}
            {url ? "Re-record" : "Record"}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={busy || recording}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="mr-1 h-4 w-4" />
          Upload
        </Button>
        {url && !recording && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            disabled={busy}
            onClick={deleteAudio}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
        )}
        {url && (
          <Check className="ml-1 h-4 w-4 self-center text-emerald-600" aria-label="Recorded" />
        )}
      </div>
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
    </div>
  )
}
