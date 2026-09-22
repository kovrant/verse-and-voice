/**
 * Lightweight Web Audio API synthesizer for a pleasant, gentle kid chime sound.
 * Zero external mp3 dependencies, works entirely in-browser.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return null
    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new AudioContextClass()
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume()
    }
    return audioCtx
  } catch {
    return null
  }
}

/**
 * Plays a warm, gentle bell chord (E5 + B5 + E6) that sounds friendly and non-jarring for kids.
 */
export function playTajweedChime(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    // Pleasant pentatonic bell notes: 659.25Hz (E5), 987.77Hz (B5), 1318.51Hz (E6)
    const frequencies = [659.25, 987.77, 1318.51]

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "sine"
      osc.frequency.setValueAtTime(freq, now + idx * 0.08)

      // Soft envelope: quick gentle attack, lingering chime release
      const startTime = now + idx * 0.08
      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.08, startTime + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.7)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 0.75)
    })
  } catch {
    // Graceful silence if audio isn't permitted by browser policy
  }
}
