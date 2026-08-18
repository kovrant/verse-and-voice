// Hijri (Islamic) calendar helpers.
//
// Uses the browser/Node-native Intl Umm al-Qura calendar ("islamic-umalqura")
// to convert today's Gregorian date to a Hijri month + year. This is a
// *calculated* calendar, so the day-of-month can be ±1 around a month boundary
// versus a local moon-sighting — but the month/year (all we need to feature
// "this Islamic month") is reliable and needs no external dependency.

export interface HijriMonthInfo {
  /** 1-based month number (1 = Muharram … 12 = Dhu al-Hijjah). */
  number: number
  /** English (transliterated) name. */
  name: string
  /** Arabic name. */
  arabic: string
  /** One-line note on the month's significance. */
  significance: string
}

/** The twelve Hijri months, with names and a short significance blurb. */
export const HIJRI_MONTHS: HijriMonthInfo[] = [
  {
    number: 1,
    name: "Muharram",
    arabic: "مُحَرَّم",
    significance:
      "One of the four sacred months. The 10th (Ashura) commemorates Allah saving Prophet Musa (AS).",
  },
  {
    number: 2,
    name: "Safar",
    arabic: "صَفَر",
    significance: "The second month; the Prophet ﷺ dispelled superstitions once linked to it.",
  },
  {
    number: 3,
    name: "Rabiʿ al-Awwal",
    arabic: "رَبِيع الأَوَّل",
    significance: "The month in which our beloved Prophet Muhammad ﷺ was born in Makkah.",
  },
  {
    number: 4,
    name: "Rabiʿ al-Thani",
    arabic: "رَبِيع الثَّانِي",
    significance: "The fourth month of the Islamic year.",
  },
  {
    number: 5,
    name: "Jumada al-Ula",
    arabic: "جُمَادَى الأُولَى",
    significance: "The fifth month; its name recalls the dry, cold season of old Arabia.",
  },
  {
    number: 6,
    name: "Jumada al-Akhirah",
    arabic: "جُمَادَى الآخِرَة",
    significance: "The sixth month of the Islamic year.",
  },
  {
    number: 7,
    name: "Rajab",
    arabic: "رَجَب",
    significance: "A sacred month; the night journey of Al-Isra wal-Miʿraj is associated with it.",
  },
  {
    number: 8,
    name: "Shaʿban",
    arabic: "شَعْبَان",
    significance: "The month before Ramadan, in which the Prophet ﷺ fasted often.",
  },
  {
    number: 9,
    name: "Ramadan",
    arabic: "رَمَضَان",
    significance: "The month of fasting and the revelation of the Holy Quran.",
  },
  {
    number: 10,
    name: "Shawwal",
    arabic: "شَوَّال",
    significance: "Begins with Eid al-Fitr; the six voluntary fasts of Shawwal are recommended.",
  },
  {
    number: 11,
    name: "Dhu al-Qaʿdah",
    arabic: "ذُو القَعْدَة",
    significance: "A sacred month of peace, preceding the season of Hajj.",
  },
  {
    number: 12,
    name: "Dhu al-Hijjah",
    arabic: "ذُو الحِجَّة",
    significance: "The month of Hajj; it contains the Day of Arafah and Eid al-Adha.",
  },
]

/** Look up a month's info by its 1-based number. Returns null if out of range. */
export function getHijriMonthInfo(month: number | null | undefined): HijriMonthInfo | null {
  if (!month || month < 1 || month > 12) return null
  return HIJRI_MONTHS[month - 1]
}

export interface HijriDate {
  /** 1-based month number. */
  month: number
  /** Day of the month (calculated; may be ±1 near a boundary). */
  day: number
  /** Hijri year. */
  year: number
  /** Rich month info. */
  monthInfo: HijriMonthInfo
  /** e.g. "12 Rabiʿ al-Awwal 1447 AH". */
  formatted: string
  /** e.g. "Rabiʿ al-Awwal 1447 AH". */
  monthYear: string
}

/**
 * Convert a Gregorian date (default: now) to its Hijri equivalent using the
 * Umm al-Qura calendar. Uses our own transliterated month names for a
 * consistent look, while pulling the numeric day/month/year from Intl.
 */
export function toHijri(date: Date = new Date()): HijriDate {
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(date)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""

  const day = parseInt(get("day"), 10) || 1
  const month = parseInt(get("month"), 10) || 1
  // The year part can carry an era suffix in some environments; strip non-digits.
  const year = parseInt(get("year").replace(/[^\d]/g, ""), 10) || 1

  const monthInfo = getHijriMonthInfo(month) ?? HIJRI_MONTHS[0]
  const monthYear = `${monthInfo.name} ${year} AH`

  return {
    month,
    day,
    year,
    monthInfo,
    monthYear,
    formatted: `${day} ${monthYear}`,
  }
}

/** Convenience: today's Hijri date. */
export function getHijriToday(): HijriDate {
  return toHijri(new Date())
}

/** `ordinalDay(1) → "1st"` — English ordinal for the Hijri day. */
export function ordinalDay(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
