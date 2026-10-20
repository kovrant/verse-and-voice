import { CONTACT } from "@/components/welcome/welcome-data"

/**
 * Public-website facts shared by metadata, the sitemap, structured data and the
 * policy pages. Keep claims here true: search engines and AI answers quote them.
 */
export const SITE = {
  url: "https://versenvoice.com",
  name: "Verse & Voice",
  title: "Online Quran Classes for Kids & Teens",
  description:
    "Live one-to-one online Quran classes for kids and teens in the USA, Canada, the Gulf and worldwide. Noorani Qaida, tajweed, hifz and namaz, by voice, with progress parents can see. Free trial.",
  /** E.164, the WhatsApp number in CONTACT.whatsapp. */
  phone: "+923310438768",
  // ponytail: no public mailbox yet; policy pages point to WhatsApp until one exists.
  email: "",
  sameAs: [CONTACT.instagram, CONTACT.facebook],
  // Priority markets: North America (teacher's morning = their evening) and the Gulf (strong currencies).
  areaServed: ["US", "CA", "BH", "KW", "QA", "AE", "OM", "SA", "GB"],
  updated: "2026-10-20",
} as const

/** Public, indexable pages. The sitemap is built from this list. */
export const PUBLIC_PAGES = [
  { path: "/", priority: 1 },
  { path: "/faq", priority: 0.8 },
  { path: "/privacy", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
] as const

export const COURSES = [
  {
    name: "Noorani Qaida for Kids",
    description:
      "Arabic letters, sounds and joining, lesson by lesson, until a child can read the Quran on their own.",
  },
  {
    name: "Quran Reading with Tajweed",
    description:
      "One-to-one reading from the mushaf, para by para, with the teacher correcting pronunciation and tajweed live.",
  },
  {
    name: "Quran Memorisation (Hifz)",
    description:
      "Short surahs for beginners through to structured hifz, with new lessons and revision tracked every class.",
  },
  {
    name: "Namaz (Salah) for Kids",
    description: "How to pray, step by step, with pictures and audio for every part of the prayer.",
  },
] as const

export function jsonLd(data: object) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") }
}
