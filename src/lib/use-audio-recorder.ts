"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { toast } from "@/lib/toast"

/**
 * Microphone recording for teacher pages. `onClip` receives the finished Blob.
 * Releases the microphone on unmount and drops a half-finished clip.
 *
 * ponytail: namaz-audio-row.tsx still carries its own copy of this logic; move it
 * onto the hook the next time that component is touched.
 */
export function useAudioRecorder(onClip: (blob: Blob) => void) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const onClipRef = useRef(onClip)
  onClipRef.current = onClip

  const start = useCallback(async () => {
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
      onClipRef.current(new Blob(chunks, { type: recorder.mimeType }))
    }
    recorderRef.current = recorder
    recorder.start()
    setSeconds(0)
    setRecording(true)
  }, [])

  const stop = useCallback(() => recorderRef.current?.stop(), [])

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

  return { recording, seconds, start, stop }
}
