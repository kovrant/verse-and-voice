import type { Metadata } from "next"

import { type Course, CoursePage } from "../course-page"

export const metadata: Metadata = {
  title: "Tajweed Classes for Kids Online: One-to-One",
  description:
    "Online tajweed classes for kids, one-to-one by voice. Rules taught with easy names young children remember, then the real tajweed names once they read the Quran. Free trial class.",
  alternates: { canonical: "/tajweed-for-kids" },
}

const COURSE: Course = {
  path: "/tajweed-for-kids",
  title: "Tajweed classes for kids online",
  intro:
    "Your child learns to recite the Quran correctly, one rule at a time, in live one-to-one classes by voice with a teacher who listens to every word.",
  courseName: "Tajweed",
  description:
    "One-to-one online tajweed for children: correct letter sounds and the rules of recitation, taught with easy names first and the proper tajweed names once the child reads the Quran.",
  sections: [
    {
      heading: "What is tajweed?",
      body: "Tajweed is the set of rules for reciting the Quran the way it was revealed: saying every letter from the right place, holding sounds for the right length and knowing where to join, soften or stop. Reading with tajweed is what makes a recitation correct and beautiful.",
    },
    {
      heading: "How we teach it to children",
      body: "Long Arabic rule names are hard for a young child to remember. So in the early lessons, each rule gets a short, easy name the child can hold on to. When your child starts reading the Quran, the real tajweed names are introduced one by one, and by then the child already knows how each rule sounds.",
    },
    {
      heading: "What your child learns",
      points: [
        "The correct sound of every Arabic letter and where it comes from in the mouth",
        "Heavy and light letters",
        "Ghunnah, the nasal sound in noon and meem",
        "The rules of noon sakin and tanween, and of meem sakin",
        "Qalqalah, the bouncing sound",
        "Madd, how long to stretch a sound",
        "Where to stop and where to continue in a verse",
      ],
    },
    {
      heading: "How a class works",
      points: [
        "One-to-one with the teacher, never a group",
        "30 minutes, 3 to 5 days a week, at a time that suits your time zone",
        "By voice, with no camera needed: your child recites and the teacher corrects each mistake as it happens",
        "Tajweed is practised on the Quran itself, para by para, not only as theory",
      ],
    },
    {
      heading: "How you follow progress",
      points: [
        "Every class is logged: the date, how long it ran and the para your child read",
        "A one-page report each month with attendance, the current para and quiz scores",
        "Questions go straight to the teacher on WhatsApp",
      ],
    },
    {
      heading: "Taught by a teacher of the Quran",
      body: "Every class is taught by Hafiz Yasir Amjad, who has taught the Quran since 2016. Nearly 25 students have finished the whole Quran in these classes, each at least twice.",
    },
  ],
  faqs: [
    {
      q: "What age can my child start tajweed?",
      a: "Tajweed starts from the very first Qaida lessons, at about age 5, with the correct sound of each letter. The rules are added gradually, and their proper names come once your child is reading the Quran.",
    },
    {
      q: "My child already reads the Quran. Can they join?",
      a: "Yes. In the free trial class the teacher listens to your child recite and starts from the rules they need most.",
    },
    {
      q: "Will my child have to memorise long rule names?",
      a: "Not at first. Young children learn each rule with an easy name, and the real tajweed names are introduced one by one when they start reading the Quran.",
    },
    {
      q: "Is tajweed taught online as well as in person?",
      a: "Yes. Because the class is one-to-one by voice, the teacher hears every letter clearly and corrects it straight away, just as in a face-to-face lesson.",
    },
  ],
}

export default function TajweedForKidsPage() {
  return <CoursePage course={COURSE} />
}
