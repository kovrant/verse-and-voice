import { Analytics } from "@vercel/analytics/next"
import type { Metadata } from "next"

import { WelcomeStory } from "@/components/welcome/welcome-story"
import { COURSES, jsonLd, SITE } from "@/lib/site"

export const metadata: Metadata = {
  title: { absolute: `${SITE.title} | ${SITE.name}` },
  description: SITE.description,
  // Served at "/" by a middleware rewrite; /welcome is the same page.
  alternates: { canonical: "/" },
}

const ORG_ID = `${SITE.url}/#organization`

/** Who we are and what we teach, for search engines and AI answer engines. */
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": ORG_ID,
      name: SITE.name,
      url: SITE.url,
      logo: `${SITE.url}/apple-icon`,
      image: `${SITE.url}/opengraph-image`,
      description: SITE.description,
      telephone: SITE.phone,
      sameAs: SITE.sameAs,
      areaServed: SITE.areaServed,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "admissions",
        telephone: SITE.phone,
        availableLanguage: ["English"],
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      url: SITE.url,
      name: SITE.name,
      publisher: { "@id": ORG_ID },
      inLanguage: "en",
    },
    ...COURSES.map((c) => ({
      "@type": "Course",
      name: c.name,
      description: c.description,
      provider: { "@id": ORG_ID },
      inLanguage: "en",
      educationalLevel: "Beginner",
      audience: {
        "@type": "EducationalAudience",
        educationalRole: "student",
        audienceType: "Children and teenagers",
      },
      hasCourseInstance: { "@type": "CourseInstance", courseMode: "Online" },
    })),
  ],
}

/**
 * The public landing page: one child's journey from the first letter to a
 * khatm, told as ten chapters that scroll from dawn to night. Rendered with the
 * student palette (see `portalForPath`) and outside the app shell.
 */
export default function WelcomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(STRUCTURED_DATA)} />
      <WelcomeStory />
      <Analytics />
    </>
  )
}
