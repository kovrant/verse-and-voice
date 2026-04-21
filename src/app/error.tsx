"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in-up">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
        <span className="text-3xl">!</span>
      </div>
      <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
      <p className="text-muted-foreground mb-6 max-w-sm">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 text-white text-sm font-medium px-6 py-2.5 shadow-btn-primary hover:shadow-btn-primary-hover hover:from-emerald-400 hover:to-emerald-500 transition-all active:scale-[0.98]"
      >
        Try Again
      </button>
    </div>
  )
}
