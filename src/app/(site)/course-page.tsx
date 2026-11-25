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
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded-full bg-[#1EBE5D] px-6 py-3 font-bold !text-white !no-underline shadow-[0_8px_20px_rgba(37,211,102,0.35)]"
      >
        Book a free trial on WhatsApp
      </a>

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
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-block rounded-full bg-[#E3B04B] px-6 py-3 font-bold !text-[#2E3A2F] !no-underline"
        >
          Book a free trial on WhatsApp
        </a>
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
