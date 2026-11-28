import Link from "next/link"

import { jsonLd, SITE } from "@/lib/site"

import { SitePage } from "./prose"

export interface Course {
  path: string
  /** h1: the search words parents type. */
  title: string
  intro: string
  /** Name used in the WhatsApp greeting and Course structured data. */
  courseName: string
  description: string
  sections: { heading: string; body?: string; points?: string[] }[]
  faqs: { q: string; a: string }[]
}

/** WhatsApp chat with a greeting that names the course, so the teacher knows the page. */
function whatsappFor(courseName: string) {
  const text = `Assalamu Alaikum! I'd like to book a free trial ${courseName} class with Verse & Voice for my child.`
  return `https://wa.me/${SITE.phone.replace("+", "")}?text=${encodeURIComponent(text)}`
}

/** WhatsApp-style button: brand green, white logo and bold white text. */
function WhatsAppButton({ href, className = "" }: { href: string; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex h-14 items-center gap-3 rounded-full bg-[#1EBE5D] pl-5 pr-7 text-[17px] !font-bold !text-white !no-underline shadow-[0_8px_20px_rgba(37,211,102,0.35)] transition-colors hover:bg-[#1AA851] ${className}`}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
      Book a free trial on WhatsApp
    </a>
  )
}

/**
 * One course landing page (Noorani Qaida, Tajweed…) aimed at a search phrase.
 * Every sentence must stay true: FAQ answers are quoted in FAQPage structured data.
 */
export function CoursePage({ course }: { course: Course }) {
  const wa = whatsappFor(course.courseName)
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Course",
      name: course.courseName,
      description: course.description,
      url: `${SITE.url}${course.path}`,
      provider: { "@type": "EducationalOrganization", name: SITE.name, url: SITE.url },
      offers: { "@type": "Offer", category: "Free trial class", price: 0, priceCurrency: "USD" },
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: "online",
        courseWorkload: "PT30M",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: course.faqs.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ]

  return (
    <SitePage title={course.title} intro={course.intro}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />
      <WhatsAppButton href={wa} />

      {course.sections.map((s) => (
        <section key={s.heading}>
          <h2>{s.heading}</h2>
          {s.body && <p className="mt-2">{s.body}</p>}
          {s.points && (
            <ul className="mt-3">
              {s.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <h2>Questions parents ask</h2>
      <div className="space-y-3">
        {course.faqs.map(({ q, a }) => (
          <div key={q} className="rounded-2xl border border-[#E8DCC4] bg-white/70 px-5 py-4">
            <h3 className="[font-family:var(--font-heading)] text-lg font-bold text-[#2E3A2F]">
              {q}
            </h3>
            <p className="mt-2 text-[#3C4A3D]">{a}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-3xl bg-[#2E3A2F] p-6 text-center text-[#F0ECDE] sm:p-8">
        <h2 className="!pt-0 !text-2xl !text-[#F0ECDE]">Start with a free class</h2>
        <p className="mt-2 text-[#D8D3C2]">
          Say salaam on WhatsApp with your child&apos;s age and the times that suit you.
        </p>
        <WhatsAppButton href={wa} className="mt-5" />
        <p className="mt-4 text-sm text-[#D8D3C2]">
          More answers in the{" "}
          <Link href="/faq" className="!text-[#E3B04B]">
            parent FAQ
          </Link>{" "}
          or see{" "}
          <Link href="/" className="!text-[#E3B04B]">
            how a class works
          </Link>
          .
        </p>
      </div>
    </SitePage>
  )
}
