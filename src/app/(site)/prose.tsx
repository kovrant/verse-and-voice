/** Shared chrome for every text page: title, last-updated line and styled prose. */
export function SitePage({
  title,
  intro,
  updated,
  children,
}: {
  title: string
  intro?: string
  updated?: string
  children: React.ReactNode
}) {
  return (
    <article>
      <h1 className="[font-family:var(--font-heading)] text-4xl font-bold leading-tight sm:text-5xl">
        {title}
      </h1>
      {intro && <p className="mt-4 text-lg text-[#55634F]">{intro}</p>}
      {updated && <p className="mt-2 text-sm text-[#7A8473]">Last updated {updated}</p>}
      <div className="mt-8 space-y-4 leading-relaxed [&_a]:font-semibold [&_a]:text-[#56684A] [&_a]:underline [&_h2]:pt-4 [&_h2]:[font-family:var(--font-heading)] [&_h2]:text-2xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">
        {children}
      </div>
    </article>
  )
}
