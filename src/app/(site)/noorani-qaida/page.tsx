import type { Metadata } from "next"

import { type Course, CoursePage } from "../course-page"

export const metadata: Metadata = {
  title: "Noorani Qaida Online for Kids: One-to-One Classes",
  description:
    "Live one-to-one Noorani Qaida classes online for children from about age 5. Arabic letters, sounds and joining, lesson by lesson, by voice with a Quran teacher. Free trial class.",
  alternates: { canonical: "/noorani-qaida" },
}

const COURSE: Course = {
  path: "/noorani-qaida",
  title: "Noorani Qaida online for kids",
  intro:
    "Live one-to-one classes that take your child from the first Arabic letter to reading the Quran on their own, by voice, with the same teacher every class.",
  courseName: "Noorani Qaida",
  description:
    "One-to-one online Noorani Qaida for children: Arabic letters, sounds, joining and harakat, lesson by lesson, until the child can read the Quran.",
  sections: [
    {
      heading: "What is Noorani Qaida?",
      body: "Noorani Qaida is the beginner's book most children use before they read the Quran. It teaches the Arabic letters, how each one sounds, how letters join together and how the small marks above and below them change the sound. Once a child finishes it, they are ready to start reading the Quran itself.",
    },
    {
      heading: "What your child learns, step by step",
      points: [
        "The single Arabic letters and the correct sound of each one",
        "How letters change shape when they join, and reading joined letters",
        "The short vowels: fatha, kasra and damma",
        "Tanween, the long vowels and the letters that stretch a sound",
        "Sukoon and shaddah, then reading whole words and short lines",
        "Moving on to the Quran, starting from the first para",
      ],
    },
    {
      heading: "How a class works",
      points: [
        "One-to-one with the teacher, never a group",
        "30 minutes, 3 to 5 days a week, at a time that suits your time zone",
        "By voice, with no camera needed: your child reads aloud and the teacher listens and corrects each sound straight away",
        "The Qaida page is shown on your child's screen, and the teacher moves it as the lesson goes",
      ],
    },
    {
      heading: "How you follow progress",
      points: [
        "Every class is logged: the date, how long it ran and the page your child reached",
        "A one-page report each month with attendance and where your child is in the Qaida",
        "Questions go straight to the teacher on WhatsApp",
      ],
    },
    {
      heading: "Taught by a teacher of the Quran",
      body: "Every class is taught by Hafiz Yasir Amjad, who has taught the Quran since 2016. Your child keeps the same teacher from the first letter to the last para.",
    },
  ],
  faqs: [
    {
      q: "What age can my child start Noorani Qaida?",
      a: "Most children start at about 5 years old, and some are ready at 4 and a half. The free trial class is a good way to see if your child is ready.",
    },
    {
      q: "How long does it take to finish the Qaida?",
      a: "Every child moves at their own pace. Children who have class more days a week usually finish sooner, and your child only moves on when each lesson is read well.",
    },
    {
      q: "Do I need to buy the Qaida book?",
      a: "No. The Qaida pages are shown on your child's screen during the class, so you do not need a printed copy.",
    },
    {
      q: "Is tajweed taught in the Qaida classes?",
      a: "Yes, from the start. Children learn the correct sound of every letter, and the main tajweed rules are introduced in a simple way that young children can remember.",
    },
  ],
}

export default function NooraniQaidaPage() {
  return <CoursePage course={COURSE} />
}
