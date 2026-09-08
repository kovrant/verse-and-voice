"use client"

import { useTheme } from "@/components/theme-provider"

/**
 * Dynamic, playful ambient background for the children's login page.
 * Features soft animated glowing orbs, twinkling geometric stars, a friendly
 * floating crescent moon, and gentle drifting clouds that create a warm,
 * magical learning atmosphere in both light and dark modes.
 */
export function LoginBackground() {
  const { dark } = useTheme()

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none -z-10"
      aria-hidden="true"
    >
      {/* ── Soft Animated Ambient Radial Gradients ── */}
      <div
        className="animate-ambient-1 absolute -left-20 -top-24 h-[32rem] w-[32rem] rounded-full opacity-45 blur-3xl"
        style={{
          background: dark
            ? "radial-gradient(circle, hsl(var(--c-p-500) / 0.35), transparent 70%)"
            : "radial-gradient(circle, hsl(var(--c-a-400) / 0.45), transparent 70%)",
        }}
      />
      <div
        className="animate-ambient-2 absolute -right-24 top-1/4 h-[30rem] w-[30rem] rounded-full opacity-40 blur-3xl"
        style={{
          background: dark
            ? "radial-gradient(circle, hsl(var(--c-a-500) / 0.25), transparent 70%)"
            : "radial-gradient(circle, hsl(var(--c-p-400) / 0.35), transparent 70%)",
        }}
      />
      <div
        className="animate-ambient-3 absolute -bottom-28 left-1/4 h-[28rem] w-[28rem] rounded-full opacity-35 blur-3xl"
        style={{
          background: dark
            ? "radial-gradient(circle, hsl(var(--c-s-500) / 0.2), transparent 70%)"
            : "radial-gradient(circle, hsl(var(--c-s-400) / 0.4), transparent 70%)",
        }}
      />

      {/* ── Playful Floating Crescent Moon (Top Left) ── */}
      <div className="animate-float-gentle absolute left-6 top-10 sm:left-14 sm:top-16 opacity-80 md:opacity-95">
        <svg
          width="54"
          height="54"
          viewBox="0 0 24 24"
          fill="none"
          className="text-amber-500/80 dark:text-amber-300/80 drop-shadow-md"
        >
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.5"
          />
          {/* Friendly mini star companion next to the moon */}
          <circle cx="18" cy="5" r="1.5" fill="currentColor" className="animate-twinkle" />
        </svg>
      </div>

      {/* ── Friendly Soft Cloud (Top Right) ── */}
      <div
        className="animate-float-reverse absolute -right-4 top-12 sm:right-12 sm:top-20 opacity-40 dark:opacity-20"
        style={{ animationDuration: "9s" }}
      >
        <svg
          width="90"
          height="54"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-foreground/20 dark:text-foreground/10"
        >
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h.79a4.5 4.5 0 1 1 1 8.9z" />
        </svg>
      </div>

      {/* ── Gentle Soft Cloud (Bottom Left) ── */}
      <div
        className="animate-float-gentle absolute left-4 bottom-16 sm:left-16 sm:bottom-24 opacity-35 dark:opacity-15 hidden sm:block"
        style={{ animationDuration: "11s" }}
      >
        <svg
          width="110"
          height="65"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-foreground/20 dark:text-foreground/10"
        >
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
        </svg>
      </div>

      {/* ── Geometric 8-Point Islamic Star (Rub el Hizb) — Mid Left ── */}
      <div
        className="animate-float-gentle absolute left-8 top-1/2 -translate-y-1/2 hidden md:block opacity-60 dark:opacity-40"
        style={{ animationDuration: "8s" }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-primary/40 dark:text-emerald-400/40"
        >
          <path d="M12 2L14.8 6.2L19.8 4.2L17.8 9.2L22 12L17.8 14.8L19.8 19.8L14.8 17.8L12 22L9.2 17.8L4.2 19.8L6.2 14.8L2 12L6.2 9.2L4.2 4.2L9.2 6.2L12 2Z" />
        </svg>
      </div>

      {/* ── Geometric 8-Point Islamic Star (Rub el Hizb) — Lower Right ── */}
      <div
        className="animate-float-reverse absolute right-10 bottom-24 hidden md:block opacity-50 dark:opacity-35"
        style={{ animationDuration: "8.5s" }}
      >
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-amber-500/40 dark:text-amber-300/30"
        >
          <path d="M12 2L14.8 6.2L19.8 4.2L17.8 9.2L22 12L17.8 14.8L19.8 19.8L14.8 17.8L12 22L9.2 17.8L4.2 19.8L6.2 14.8L2 12L6.2 9.2L4.2 4.2L9.2 6.2L12 2Z" />
        </svg>
      </div>

      {/* ── Twinkling 4-Point Sparkle Stars (Scattered Around) ── */}
      {/* Top Center-Right Sparkle */}
      <div
        className="animate-twinkle absolute right-1/4 top-16 opacity-70"
        style={{ animationDelay: "0.2s", animationDuration: "3.2s" }}
      >
        <SparkleIcon className="h-5 w-5 text-amber-500/70 dark:text-amber-300/80" />
      </div>

      {/* Left Mid Sparkle */}
      <div
        className="animate-twinkle absolute left-1/4 top-1/3 opacity-60"
        style={{ animationDelay: "1.1s", animationDuration: "2.8s" }}
      >
        <SparkleIcon className="h-4 w-4 text-emerald-600/60 dark:text-emerald-300/70" />
      </div>

      {/* Right Mid Sparkle */}
      <div
        className="animate-twinkle absolute right-8 sm:right-24 top-1/2 opacity-75"
        style={{ animationDelay: "1.8s", animationDuration: "3.5s" }}
      >
        <SparkleIcon className="h-6 w-6 text-amber-500/80 dark:text-amber-200/90" />
      </div>

      {/* Bottom Right Sparkle */}
      <div
        className="animate-twinkle absolute right-1/3 bottom-14 opacity-60"
        style={{ animationDelay: "0.7s", animationDuration: "2.5s" }}
      >
        <SparkleIcon className="h-4 w-4 text-emerald-600/70 dark:text-emerald-300/80" />
      </div>

      {/* Bottom Left Sparkle */}
      <div
        className="animate-twinkle absolute left-10 sm:left-20 bottom-12 opacity-65"
        style={{ animationDelay: "2.3s", animationDuration: "3s" }}
      >
        <SparkleIcon className="h-5 w-5 text-amber-500/75 dark:text-amber-300/85" />
      </div>
    </div>
  )
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
    </svg>
  )
}
