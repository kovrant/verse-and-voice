import type { Metadata } from "next"
import Link from "next/link"

import { CONTACT } from "@/components/welcome/welcome-data"
import { jsonLd } from "@/lib/site"

import { SitePage } from "../prose"

export const metadata: Metadata = {
  title: "Online Quran Classes for Kids: Parent FAQ",
  description:
    "Answers for parents in the USA, Canada, the Gulf and worldwide: how our one-to-one online Quran classes work, ages, Noorani Qaida, tajweed, hifz, class times, progress reports and the free trial.",
  alternates: { canonical: "/faq" },
}

/**
 * Parent questions, written the way parents ask them in search and AI chat.
 * Every answer must stay true: it is quoted verbatim in FAQPage structured data.
 */
const FAQS: { q: string; a: string }[] = [
  {
    q: "What does Verse & Voice teach?",
    a: "Live one-to-one online Quran classes for children and teenagers: Noorani Qaida for beginners, Quran reading with tajweed, Quran memorisation (hifz), how to pray (namaz), and stories of the Prophets with short quizzes.",
  },
  {
    q: "What ages are the classes for?",
    a: "Children from about 4 years old up to teenagers. Little Readers (4 to 8) start with the Arabic letters, Young Reciters (9 to 13) read and memorise surahs, and Teens (14+) work at their own pace on reading, tajweed and hifz.",
  },
  {
    q: "How do online Quran classes work?",
    a: "Each class is one teacher and one child, by voice. The child opens the kids' portal and sees the same Qaida or Quran page as the teacher. When the teacher turns the page or points to a line, the child's screen follows, so the child always knows where to read.",
  },
  {
    q: "Does my child need a camera?",
    a: "No. Classes are taught by voice, so your child only needs a phone, tablet or computer with a speaker, a microphone and a steady internet connection.",
  },
  {
    q: "Can you teach in US, Canadian or Gulf time zones?",
    a: "Yes. We teach families in the USA and Canada, in the Gulf (Bahrain, Kuwait, Qatar, the UAE, Oman and Saudi Arabia), in the UK and around the world, and agree class times in your own time zone. Evening classes after school work well for families in North America, and afternoon or evening classes for families in the Gulf. The portal shows the class time in your local time.",
  },
  {
    q: "Is there a free trial class?",
    a: "Yes. The first class is a free trial with no obligation, so your child can meet the teacher and you can see how the lesson works before deciding.",
  },
  {
    q: "My child is a complete beginner. Where do they start?",
    a: "With Noorani Qaida: the Arabic letters, their sounds, then joining letters into words, one lesson at a time. Once your child can read fluently from the Qaida they move on to reading the Quran itself.",
  },
  {
    q: "Do you teach tajweed?",
    a: "Yes. Tajweed is taught as your child reads: the teacher listens to every line and corrects pronunciation and the rules of recitation in the moment, which is the main advantage of one-to-one classes.",
  },
  {
    q: "Can my child memorise the Quran (hifz) online?",
    a: "Yes. Children start with short surahs and can move on to structured hifz. Each class records the new lesson and the revision, so nothing that has been memorised is forgotten.",
  },
  {
    q: "Do you teach children how to pray?",
    a: "Yes. Namaz is taught step by step, with a picture and audio for every part of the prayer, so children can practise the words and movements at home between classes.",
  },
  {
    q: "How will I know my child is making progress?",
    a: "You see attendance, the lessons covered and progress through the Quran para by para, and you receive a monthly report showing exactly where your child is.",
  },
  {
    q: "What does my child do between classes?",
    a: "In the kids' portal they can revise their Qaida and Quran pages, listen to and practise namaz, read stories of the Prophets, answer quizzes, and earn stars and badges for keeping up their practice.",
  },
  {
    q: "How much do the classes cost?",
    a: "Fees depend on how many classes a week your child takes, and can be paid monthly in your local currency, such as US or Canadian dollars, dinars, riyals, dirhams or pounds. Message us for the current fees; the trial class is free.",
  },
  {
    q: "How do I book a free trial?",
    a: "Send us a message on WhatsApp, Instagram or Facebook with your child's age and the times that suit you, and we will arrange the free trial class.",
  },
]

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
}

export default function FaqPage() {
  return (
    <SitePage
      title="Online Quran classes for kids: questions parents ask"
      intro="Everything families in the USA, Canada, the Gulf and around the world ask us before their child's first class."
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(STRUCTURED_DATA)} />
      <div className="space-y-3">
        {FAQS.map(({ q, a }, i) => (
          <details
            key={q}
            open={i < 3}
            className="group rounded-2xl border border-[#E8DCC4] bg-white/70 px-5 py-4 open:bg-white"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [font-family:var(--font-heading)] text-lg font-bold [&::-webkit-details-marker]:hidden">
              <h2 className="!p-0 !text-lg">{q}</h2>
              <span
                aria-hidden="true"
                className="text-2xl leading-none text-[#6B7F5B] transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-[#3C4A3D]">{a}</p>
          </details>
        ))}
      </div>
      <div className="mt-10 rounded-3xl bg-[#2E3A2F] p-6 text-center text-[#F0ECDE] sm:p-8">
        <h2 className="!text-2xl !text-[#F0ECDE]">Ready for the first class?</h2>
        <p className="mt-2 text-[#D8D3C2]">
          Say salaam and we&apos;ll set up a free trial in your own time.
        </p>
        <a
          href={CONTACT.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-block rounded-full bg-[#E3B04B] px-6 py-3 font-bold !text-[#2E3A2F] !no-underline"
        >
          Book a free trial on WhatsApp
        </a>
        <p className="mt-4 text-sm text-[#D8D3C2]">
          Or see{" "}
          <Link href="/" className="!text-[#E3B04B]">
            how a class works
          </Link>
          .
        </p>
      </div>
    </SitePage>
  )
}
