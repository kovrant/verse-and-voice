import type { KidColor } from "@/components/student-nav"

type Shape = "star" | "moon" | "dot" | "cloud"

/** Scattered doodles in the crayon colours. Percent positions keep them off the content column's edges. */
const DOODLES: { shape: Shape; color: KidColor; top: string; left: string; size: number }[] = [
  { shape: "star", color: "saffron", top: "9%", left: "88%", size: 22 },
  { shape: "moon", color: "lavender", top: "18%", left: "3%", size: 26 },
  { shape: "dot", color: "coral", top: "30%", left: "95%", size: 10 },
  { shape: "cloud", color: "sky", top: "38%", left: "1%", size: 44 },
  { shape: "star", color: "teal", top: "52%", left: "92%", size: 16 },
  { shape: "dot", color: "sage", top: "60%", left: "6%", size: 12 },
  { shape: "moon", color: "saffron", top: "70%", left: "90%", size: 22 },
  { shape: "star", color: "rose", top: "82%", left: "4%", size: 18 },
  { shape: "cloud", color: "lavender", top: "88%", left: "70%", size: 40 },
  { shape: "dot", color: "sky", top: "94%", left: "24%", size: 9 },
]

function DoodleShape({ shape }: { shape: Shape }) {
  switch (shape) {
    case "star":
      return <path d="M12 2l2.6 6.6L21 12l-6.4 3.4L12 22l-2.6-6.6L3 12l6.4-3.4z" />
    case "moon":
      return <path d="M15 3a9 9 0 1 0 6 15.5A7.5 7.5 0 0 1 15 3z" />
    case "dot":
      return <circle cx="12" cy="12" r="9" />
    case "cloud":
      return <path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8.6 4.7 4.7 0 0 1 18 18z" />
  }
}

/**
 * Student portal background: soft colour clouds plus a sprinkle of drifting
 * doodles in the crayon colours. Fixed to the viewport and clipped so the
 * off-screen clouds can't add scroll. Motion uses the float utilities, which respect
 * prefers-reduced-motion.
 */
export function StudentBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-background" />
      {/* Colour clouds — sunrise wash rather than a flat wall. */}
      {(
        [
          ["sage", "-top-40 -left-32 h-[34rem] w-[34rem]"],
          ["sky", "-top-24 -right-40 h-[36rem] w-[36rem]"],
          ["saffron", "top-[45%] -left-40 h-[30rem] w-[30rem]"],
          ["rose", "-bottom-48 right-[10%] h-[34rem] w-[34rem]"],
          ["lavender", "-bottom-40 left-[25%] h-[26rem] w-[26rem]"],
        ] as const
      ).map(([color, pos]) => (
        <div
          key={color}
          className={`absolute rounded-full blur-3xl ${pos}`}
          style={{
            background: `radial-gradient(circle, hsl(var(--kid-${color}) / 0.32), transparent 68%)`,
          }}
        />
      ))}
      {DOODLES.map((d, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          width={d.size}
          height={d.size}
          className={`absolute ${i % 2 ? "animate-float-reverse" : "animate-float-gentle"}`}
          style={{
            top: d.top,
            left: d.left,
            fill: `hsl(var(--kid-${d.color}) / ${d.shape === "cloud" ? 0.35 : 0.6})`,
            animationDelay: `${i * 0.7}s`,
          }}
        >
          <DoodleShape shape={d.shape} />
        </svg>
      ))}
    </div>
  )
}
