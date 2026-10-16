import type { Metadata } from "next"

import { WelcomeStory } from "@/components/welcome/welcome-story"
import { getNamazSlides } from "@/lib/welcome-namaz"

export const metadata: Metadata = {
  title: "Verse & Voice · Quran classes for kids and teens",
  description:
    "Live one-to-one Quran classes for children and teenagers, by voice, with a teacher who listens. Qaida, Quran, memorisation, namaz and stories, with progress parents can see.",
}

// The salah chapter reads the teacher-checked Arabic from the namaz tables;
// refresh it hourly rather than on every visit.
export const revalidate = 3600

/**
 * The public landing page: one child's journey from the first letter to a
 * khatm, told as ten chapters that scroll from dawn to night. Rendered with the
 * student palette (see `portalForPath`) and outside the app shell.
 */
export default async function WelcomePage() {
  const namaz = await getNamazSlides()
  return <WelcomeStory namaz={namaz} />
}
