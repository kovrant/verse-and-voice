"use client"

import { ar, BODY, f, HEAD, mix } from "@/components/welcome/welcome-styles"
import type { NamazSlide } from "@/lib/welcome-namaz"

const ROSE = "#C98A8A"

/**
 * Chapter 6 at a glance: the nine salah steps in order, each with its number,
 * its name and what you say. No drawings: plain, calm cards. Short tasbihs show the teacher-checked Arabic;
 * steps with several long parts list the part names instead. Nothing moves,
 * nothing to click.
 */
export function PraySteps({ slides }: { slides: NamazSlide[] }) {
  const steps = Array.from(new Set(slides.map((s) => s.step))).map((step) => {
    const parts = slides.filter((s) => s.step === step)
    const first = parts[0]
    const short = parts.length === 1 && first.arabic.length <= 40
    return {
      step,
      index: first.stepIndex,
      arabic: short ? first.arabic : null,
      parts: parts.map((p) => p.part),
    }
  })

  if (steps.length === 0) {
    return (
      <div
        style={{
          padding: "clamp(20px,3vw,32px)",
          borderRadius: 24,
          background: "#FFFFFF",
          border: `1.5px solid ${mix(ROSE, 45)}`,
          ...f(600, "16px", "1.5", BODY),
        }}
      >
        The salah steps are shown with their checked Arabic in the app. Ask us for a peek in your
        trial class.
      </div>
    )
  }

  return (
    <ol
      aria-label="The nine steps of salah, in order"
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(78px,1fr))",
        gap: 10,
      }}
    >
      {steps.map((st, k) => {
        return (
          <li
            key={st.step}
            data-from="translateY(14px) scale(.94)"
            data-fade=""
            data-delay={k * 60}
            data-dur="600"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "14px 8px 12px",
              borderRadius: 20,
              background: "#FFFFFF",
              border: `1.5px solid ${mix(ROSE, 45)}`,
              boxShadow: "0 6px 16px rgba(46,58,47,0.08)",
              textAlign: "center",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "grid",
                placeItems: "center",
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: mix(ROSE, 28),
                color: "#864848",
                ...f(700, "15px", "1", HEAD),
              }}
            >
              {st.index}
            </span>
            <span style={{ ...f(700, "15px", "1.1", HEAD), color: "#2E3A2F" }}>{st.step}</span>
            {st.arabic ? (
              <span lang="ar" dir="rtl" style={{ ...ar(600, "16px", "1.7"), color: "#2E3A2F" }}>
                {st.arabic}
              </span>
            ) : (
              <span style={{ ...f(600, "11px", "1.35", BODY), color: "#6B5B5B" }}>
                {st.parts.join(" · ")}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
