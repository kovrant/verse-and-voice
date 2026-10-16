import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase-admin"

/** One slide of the landing page's salah showcase: a step's part with its checked Arabic. */
export type NamazSlide = {
  step: string
  stepIndex: number
  stepCount: number
  part: string
  arabic: string
  meaning: string | null
  action: string | null
  tr: string | null
  repeat: number | null
}

/**
 * The salah steps for /welcome, straight from the namaz tables so the page can
 * never drift from the Arabic the teacher checked. Public page, so this reads
 * with the service role on the server; any failure yields an empty list and the
 * chapter renders its fallback instead of breaking the page.
 */
export async function getNamazSlides(): Promise<NamazSlide[]> {
  try {
    const db = createSupabaseAdminClient()
    const [{ data: steps }, { data: parts }] = await Promise.all([
      db.from("namaz_steps").select("id, title, order_index").order("order_index"),
      db
        .from("namaz_step_parts")
        .select(
          "step_id, title, order_index, arabic_text, translation, action_text, word_tr, repeat_count",
        )
        .order("order_index"),
    ])
    if (!steps?.length || !parts) return []
    const slides: NamazSlide[] = []
    steps.forEach((s, i) => {
      parts
        .filter((p) => p.step_id === s.id && p.arabic_text)
        .forEach((p) =>
          slides.push({
            step: s.title,
            stepIndex: i + 1,
            stepCount: steps.length,
            part: p.title,
            arabic: p.arabic_text as string,
            meaning: p.translation ?? null,
            action: p.action_text ?? null,
            // word_tr splits long words with a trailing hyphen ("Bismil- lahir-"); rejoin them.
            tr: p.word_tr?.length ? (p.word_tr as string[]).join(" ").replace(/- /g, "-") : null,
            repeat: p.repeat_count ?? null,
          }),
        )
    })
    return slides
  } catch {
    return []
  }
}
