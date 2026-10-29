"use client"

/**
 * The kids' "leave class" button: an arched door. On hover or press it swings
 * open onto a little night sky with Hilal's crescent and a star, as if the
 * child is heading home. No drawn people, on purpose.
 */
export function LeaveDoorButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Leave class"
      className="group inline-flex flex-shrink-0 items-center gap-2 rounded-full border-[1.5px] border-border bg-card/90 py-1 pl-1.5 pr-4 font-heading text-[15px] font-bold text-primary shadow-soft backdrop-blur-sm transition-transform hover:-translate-y-0.5 hover:border-[hsl(var(--kid-coral)/0.6)] active:scale-[0.97] focus-visible:[outline:3px_solid_hsl(var(--kid-coral)/0.55)] focus-visible:[outline-offset:3px]"
    >
      <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden>
        {/* the arch and the sky beyond it */}
        <path
          d="M9 36 V17 a11 11 0 0 1 22 0 V36 Z"
          fill="#2E3A4A"
          stroke="hsl(125 12% 20%)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M23.5 15 a5 5 0 1 0 3 8.6 a4 4 0 0 1 -3 -8.6z"
          fill="#E3B04B"
          className="origin-center opacity-0 transition-opacity duration-300 [transform-box:fill-box] group-hover:opacity-100 group-active:opacity-100"
        />
        <path
          d="M15 13 l1 2.2 2.2 1 -2.2 1 -1 2.2 -1 -2.2 -2.2 -1 2.2 -1z"
          fill="#F0ECDE"
          className="opacity-0 transition-opacity delay-100 duration-300 group-hover:animate-twinkle group-hover:opacity-100 group-active:opacity-100"
        />
        {/* the door, hinged on the left, swings open */}
        <g className="origin-left transition-transform duration-500 ease-[cubic-bezier(.34,1.4,.64,1)] [transform-box:fill-box] group-hover:[transform:scaleX(.28)] group-active:[transform:scaleX(.28)]">
          <path d="M10.2 35 V17 a9.8 9.8 0 0 1 19.6 0 V35 Z" fill="hsl(var(--kid-coral))" />
          <path
            d="M14 33 V19 M20 33 V14 M26 33 V19"
            stroke="hsl(16 50% 48%)"
            strokeWidth="1.2"
            opacity=".55"
          />
          <circle
            cx="25.5"
            cy="25"
            r="1.6"
            fill="#E3B04B"
            stroke="hsl(125 12% 20%)"
            strokeWidth=".8"
          />
        </g>
        {/* doorstep */}
        <path d="M6 36.5 H34" stroke="hsl(125 12% 20%)" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      Bye for now
    </button>
  )
}
