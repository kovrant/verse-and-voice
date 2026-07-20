import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in-up">
      <div className="relative mb-6">
        <div className="text-8xl font-bold text-foreground">404</div>
      </div>
      <h1 className="text-xl font-bold mb-2">Page Not Found</h1>
      <p className="text-muted-foreground mb-6 max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-medium px-6 py-2.5 hover:bg-primary-hover transition-all active:scale-[0.98]"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
