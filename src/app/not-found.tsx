import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in-up">
      <div className="relative mb-6">
        <div className="text-8xl font-bold text-gradient-gold">404</div>
        <div className="absolute inset-0 islamic-pattern opacity-40 pointer-events-none" />
      </div>
      <h1 className="text-xl font-bold mb-2">Page Not Found</h1>
      <p className="text-muted-foreground mb-6 max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 text-white text-sm font-medium px-6 py-2.5 shadow-btn-primary hover:shadow-btn-primary-hover hover:from-emerald-400 hover:to-emerald-500 transition-all active:scale-[0.98]"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
