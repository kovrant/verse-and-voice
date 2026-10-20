import type { Metadata } from "next"
import Link from "next/link"

import { CONTACT } from "@/components/welcome/welcome-data"

import { SitePage } from "../prose"

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms for Verse & Voice online Quran classes: trial class, scheduling, missed classes, fees, the kids' portal and safeguarding.",
  alternates: { canonical: "/terms" },
}

// ponytail: plain-English terms for a small academy; the notice periods below are the owner's to change.
export default function TermsPage() {
  return (
    <SitePage
      title="Terms of Service"
      intro="Plain-English terms for families who study with Verse & Voice. By booking a class you agree to them."
      updated="20 October 2026"
    >
      <h2>The classes</h2>
      <p>
        Verse &amp; Voice provides live one-to-one online Quran classes for children and teenagers:
        Noorani Qaida, Quran reading with tajweed, memorisation (hifz), namaz and Islamic stories.
        Classes are taught by voice, and the child follows the lesson in the kids&apos; portal.
      </p>

      <h2>Free trial class</h2>
      <p>
        Your first class is a free trial with no obligation. Afterwards you decide whether to
        continue and agree the class days, times and monthly fee with us.
      </p>

      <h2>Parents and guardians</h2>
      <p>
        Classes must be booked by a parent or guardian, who accepts these terms for the child. A
        parent should be at home during class for children under 13. Please make sure your child has
        a quiet space, a working internet connection and a device with a speaker and microphone.
      </p>

      <h2>Scheduling and missed classes</h2>
      <ul>
        <li>Class times are agreed in your own time zone and shown in the portal.</li>
        <li>
          If your child cannot attend, please let us know at least a few hours before class so we
          can try to arrange a make-up class. Classes missed without notice may not be made up.
        </li>
        <li>
          If we have to cancel a class, we will offer a make-up class at a time that suits you.
        </li>
      </ul>

      <h2>Fees</h2>
      <ul>
        <li>
          Fees are agreed with each family before regular classes begin and are paid monthly in
          advance.
        </li>
        <li>Fees can be paid in your local currency by the method we agree with you.</li>
        <li>
          To stop classes, please give us notice before the next month begins. Fees already paid for
          a month that has started are not normally refunded, but tell us if something has gone
          wrong and we will try to put it right.
        </li>
      </ul>

      <h2>The kids&apos; portal</h2>
      <p>
        Each enrolled child gets a personal sign-in to the portal. Please keep it private and do not
        share it with anyone else. The lessons, recordings, pictures, stories and other material in
        the portal are for your child&apos;s personal learning only and may not be copied or shared.
        We may pause access to the portal while fees are overdue or after classes end.
      </p>

      <h2>Safeguarding and behaviour</h2>
      <p>
        We expect kind, respectful behaviour from everyone in class. If we ever have a concern about
        a child&apos;s safety or wellbeing, we will speak to the parent. We may end classes if the
        behaviour of a student or family member makes teaching impossible.
      </p>

      <h2>Our responsibility</h2>
      <p>
        We teach every class with care, but we cannot promise a particular result by a particular
        date, because every child learns at their own pace. We are not responsible for problems
        caused by your internet connection, device or third-party apps. Nothing in these terms
        removes rights you have under the consumer law of your country.
      </p>

      <h2>Your information</h2>
      <p>
        How we use information about you and your child is explained in our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms and will change the date at the top when we do. Questions? Message
        us on{" "}
        <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        .
      </p>
    </SitePage>
  )
}
