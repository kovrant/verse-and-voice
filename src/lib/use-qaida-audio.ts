"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { QAIDA_AUDIO_SELECT, type QaidaAudioRow } from "@/lib/qaida-course"
import { supabase } from "@/lib/supabase"

/**
 * The teacher's Qaida recordings as `audio_key → url`, plus a player that keeps
 * one clip playing at a time. Missing table or no rows → an empty map, so cards
 * simply hide their speaker buttons.
 */
export function useQaidaAudio(enabled = true) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!enabled) return
    let active = true
    // ponytail: ~330 rows, under PostgREST's 1000 cap; switch to fetchAllRows past that.
    supabase
      .from("qaida_audio")
      .select(QAIDA_AUDIO_SELECT)
      .then(({ data }) => {
        if (!active) return
        const map: Record<string, string> = {}
        for (const r of (data as QaidaAudioRow[] | null) ?? []) map[r.audio_key] = r.audio_url
        setUrls(map)
      })
    return () => {
      active = false
    }
  }, [enabled])

  useEffect(() => () => audioRef.current?.pause(), [])

  /** Play a clip by key. Returns false when there is no recording for it. */
  const play = useCallback(
    (key: string) => {
      const url = urls[key]
      if (!url) return false
      audioRef.current?.pause()
      const a = new Audio(url)
      audioRef.current = a
      void a.play().catch(() => {})
      return true
    },
    [urls],
  )

  return { urls, play }
}
