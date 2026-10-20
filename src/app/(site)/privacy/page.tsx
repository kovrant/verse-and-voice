import type { Metadata } from "next"
import Link from "next/link"

import { CONTACT } from "@/components/welcome/welcome-data"

import { SitePage } from "../prose"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Verse & Voice collects, uses and protects information about the children we teach and their parents.",
  alternates: { canonical: "/privacy" },
}

// ponytail: written for a one-teacher academy; have it reviewed if the academy grows or takes card payments online.
export default function PrivacyPage() {
  return (
    <SitePage
      title="Privacy Policy"
      intro="We teach children, so we keep as little information as we can and look after it carefully. This page explains what we collect, why, and the choices you have."
      updated="20 October 2026"
    >
      <h2>Who we are</h2>
      <p>
        Verse &amp; Voice (&ldquo;we&rdquo;, &ldquo;us&rdquo;) runs live one-to-one online Quran
        classes for children and teenagers at versenvoice.com. We are responsible for the personal
        information described here. You can reach us on{" "}
        <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>{" "}
        about anything on this page.
      </p>

      <h2>Children and parental consent</h2>
      <p>
        A parent or guardian enrols the child and agrees to this policy on the child&apos;s behalf.
        We do not let children sign up by themselves, and we do not ask a child for their address,
        phone number, email address, school or photo. If you think a child has given us information
        without a parent&apos;s permission, tell us and we will delete it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>When you contact us</strong> (WhatsApp, Instagram or Facebook): your name, phone
          number or profile, your child&apos;s first name and age, and what you write to us.
        </li>
        <li>
          <strong>When your child is enrolled</strong>: the child&apos;s name, a username and
          password for the kids&apos; portal, class days and times, attendance, and learning
          progress (Qaida lessons, Quran pages and paras, memorisation, namaz, quiz answers and
          badges).
        </li>
        <li>
          <strong>Fees</strong>: the amount, currency and month of each payment. We never see or
          store card or bank details on this website.
        </li>
        <li>
          <strong>Portal activity</strong>: which pages of the kids&apos; portal your child opens,
          for how long, and the type of device, so the teacher can see that homework was practised.
        </li>
        <li>
          <strong>Website visits</strong>: anonymous, cookie-free statistics (pages viewed, country,
          device type and the site that referred you) through Vercel Web Analytics. These cannot be
          used to identify you.
        </li>
      </ul>

      <h2>Classes are by voice</h2>
      <p>Lessons are one-to-one and taught by voice. We do not ask children to turn on a camera.</p>

      <h2>Why we use it</h2>
      <ul>
        <li>To arrange and teach classes, and to keep track of each child&apos;s progress.</li>
        <li>To send parents progress updates and the monthly report, and to keep fee records.</li>
        <li>To keep the portal secure and working.</li>
        <li>To understand, in total, how people find our website so we can improve it.</li>
      </ul>
      <p>
        Our legal bases are the agreement with you to provide classes, our legitimate interest in
        running the academy safely, and your consent where we ask for it. We never sell personal
        information, never show advertising in the portal, and never use children&apos;s information
        for marketing.
      </p>

      <h2>Cookies</h2>
      <p>
        The public website sets no tracking or advertising cookies. The kids&apos; portal and
        teacher dashboard use essential cookies only, to keep you signed in, and the browser
        remembers a light or dark theme choice. Because these are strictly necessary, we do not show
        a cookie banner.
      </p>

      <h2>Who we share it with</h2>
      <p>We use a small number of trusted service providers who process data on our behalf:</p>
      <ul>
        <li>
          <strong>Vercel</strong>, which hosts the website and provides the anonymous visit
          statistics.
        </li>
        <li>
          <strong>Supabase</strong>, which stores portal accounts and learning records.
        </li>
        <li>
          <strong>Meta (WhatsApp, Instagram, Facebook)</strong>, when you choose to message us
          there.
        </li>
        <li>
          <strong>Google</strong>, whose AI helps the teacher write stories and quizzes. We do not
          send children&apos;s names or details to it.
        </li>
      </ul>
      <p>
        Some of these providers store data outside your country, including in the United States and
        the European Union. They protect it under their own data-protection agreements. We share
        information with anyone else only if the law requires it.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep a child&apos;s account and progress while they study with us. When classes stop, we
        delete the portal account and learning records within 12 months, or sooner if you ask. Fee
        records may be kept longer where the law requires.
      </p>

      <h2>Your rights</h2>
      <p>
        Wherever you live, including the United States, Canada, the Gulf countries, the UK and the
        European Union, you can ask us to show you the information we hold about you or your child,
        correct it, delete it, or stop using it. Message us and we will reply within one month. If
        you are unhappy with our answer, you can complain to your local data-protection authority,
        such as the Information Commissioner&apos;s Office (ICO) in the UK.
      </p>

      <h2>Keeping it safe</h2>
      <p>
        Portal passwords are stored encrypted, every connection to the site is encrypted, and each
        child can see only their own records. Only the teacher can see student details.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy we will update the date at the top and, for important changes, let
        enrolled families know. See also our <Link href="/terms">Terms of Service</Link>.
      </p>
    </SitePage>
  )
}
