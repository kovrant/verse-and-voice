"use client"

import { BookOpen } from "lucide-react"

import { journeyStops } from "@/lib/journey"

/**
 * Winding "journey" path through the 30 paras. `done` is the student's current
 * position (para they're on); nodes before it read as completed, the node at it
 * is "You are here", and the rest are upcoming milestones ending in a trophy.
 */
export function JourneyPath({
  done,
  total = 30,
  tall = false,
}: {
  done: number
  total?: number
  tall?: boolean
}) {
  const ns = journeyStops(done, total)

  // Lay the stops out evenly across the canvas with an alternating (wave) y.
  // `tall` scales the whole drawing — beads, type and wave depth together — so
  // on a portrait tablet it fills its panel instead of floating in the middle
  // of it. Scaling everything (rather than just deepening the wave) keeps the
  // path gentle and makes the labels easier to read at that size.
  const W = 1010
  const H = tall ? 340 : 176
  const [yTop, yBottom] = tall ? [120, 220] : [68, 122]
  const s = tall ? 1.4 : 1
  const MX = 70
  const step = ns.length > 1 ? (W - MX * 2) / (ns.length - 1) : 0
  const nodes = ns.map((n, i) => ({ n, x: MX + i * step, y: i % 2 === 0 ? yTop : yBottom }))

  const thru = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return ""
    let d = `M${pts[0].x},${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]
      const b = pts[i]
      const dx = (b.x - a.x) * 0.5
      d += ` C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`
    }
    return d
  }
  const donePts = nodes.filter((p) => p.n <= done)
  const remPts = nodes.filter((p) => p.n >= done)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" aria-hidden>
      <path
        d={thru(remPts)}
        fill="none"
        stroke="hsl(var(--secondary))"
        strokeWidth={7 * s}
        strokeLinecap="round"
      />
      <path
        d={thru(donePts)}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={7 * s}
        strokeLinecap="round"
      />
      {nodes.map((p) => {
        const isFinish = p.n === total
        const isCurrent = p.n === done && !isFinish
        const isDone = p.n < done

        // Finish trophy — filled once the whole Quran is done, dashed otherwise.
        if (isFinish) {
          const reached = done >= total
          return (
            <g key={`fin-${p.n}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r={21 * s}
                fill={reached ? "hsl(var(--primary))" : "hsl(var(--secondary))"}
                stroke={reached ? "hsl(var(--primary))" : "hsl(var(--taupe))"}
                strokeWidth={2 * s}
                strokeDasharray={reached ? undefined : `${4 * s} ${3 * s}`}
              />
              <text x={p.x} y={p.y + 5 * s} textAnchor="middle" fontSize={16 * s}>
                🏆
              </text>
              <text
                x={p.x}
                y={p.y + 42 * s}
                textAnchor="middle"
                fontSize={12 * s}
                fontWeight={700}
                fill="hsl(var(--muted-foreground))"
              >
                Finish
              </text>
            </g>
          )
        }

        if (isCurrent)
          return (
            <g key={`cur-${p.n}`}>
              <circle cx={p.x} cy={p.y} r={30 * s} fill="hsl(var(--sage) / 0.28)" />
              <circle
                cx={p.x}
                cy={p.y}
                r={22 * s}
                fill="hsl(var(--primary))"
                stroke="hsl(var(--sage))"
                strokeWidth={3 * s}
              />
              <g transform={`translate(${p.x - 9 * s},${p.y - 9 * s})`}>
                <BookOpen size={18 * s} color="hsl(var(--primary-foreground))" />
              </g>
              <text
                x={p.x}
                y={p.y + 46 * s}
                textAnchor="middle"
                fontSize={12 * s}
                fontWeight={800}
                fill="hsl(var(--primary))"
              >
                You are here
              </text>
            </g>
          )

        if (isDone)
          return (
            <g key={`done-${p.n}`}>
              <circle cx={p.x} cy={p.y} r={19 * s} fill="hsl(var(--primary))" />
              <path
                d={`M${p.x - 6 * s} ${p.y} l${4 * s} ${4 * s} l${8 * s} ${-8 * s}`}
                fill="none"
                stroke="hsl(var(--primary-foreground))"
                strokeWidth={3 * s}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text
                x={p.x}
                y={p.y + 40 * s}
                textAnchor="middle"
                fontSize={12 * s}
                fontWeight={700}
                fill="hsl(var(--muted-foreground))"
              >
                Para {p.n}
              </text>
            </g>
          )

        return (
          <g key={`todo-${p.n}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r={19 * s}
              fill="hsl(var(--card))"
              stroke="hsl(var(--secondary))"
              strokeWidth={2 * s}
            />
            <text
              x={p.x}
              y={p.y + 5 * s}
              textAnchor="middle"
              className="font-heading"
              fontSize={15 * s}
              fontWeight={700}
              fill="hsl(var(--muted-foreground))"
            >
              {p.n}
            </text>
            <text
              x={p.x}
              y={p.y + 40 * s}
              textAnchor="middle"
              fontSize={12 * s}
              fontWeight={700}
              fill="hsl(var(--muted-foreground))"
            >
              Para {p.n}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
