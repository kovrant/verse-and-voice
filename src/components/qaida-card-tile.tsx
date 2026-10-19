import { Volume2, VolumeX } from "lucide-react"

import type { Card } from "@/content/qaida"
import { cn } from "@/lib/utils"

const TYPE_LABEL: Record<Card["type"], string> = {
  rule: "Rule",
  family: "Family",
  letter: "Letter",
  syllable: "Sound",
  drill: "Drill",
  shapes: "Shapes",
  word: "Word",
  ayah: "Ayah",
  exercise: "Exercise",
  check: "Check",
  celebrate: "Celebrate",
}

/**
 * Compact teacher-side view of one course card: what it is, its Arabic, and whether
 * its clip is recorded. The child-facing renderer comes with the live deck (phase 2).
 */
export function QaidaCardTile({
  card,
  recorded,
  onRecord,
}: {
  card: Card
  /** For cards with audio: true when every clip they play is recorded; null when the card has no audio. */
  recorded: boolean | null
  onRecord?: () => void
}) {
  const heavy = "heavy" in card && card.heavy
  const wide =
    card.type === "rule" ||
    card.type === "exercise" ||
    card.type === "drill" ||
    card.type === "check" ||
    card.type === "celebrate" ||
    card.type === "family" ||
    card.type === "ayah"
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1.5 rounded-2xl border border-border/50 bg-card p-3",
        wide && "sm:col-span-2",
        card.type === "exercise" && "border-dashed bg-sky-500/[0.04]",
        card.type === "check" && "bg-violet-500/[0.05]",
        card.type === "celebrate" && "bg-amber-400/10",
      )}
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>
          {card.type === "exercise" ? card.kind.replace(/-/g, " ") : TYPE_LABEL[card.type]}
        </span>
        {heavy && <span className="text-amber-600">heavy</span>}
        {recorded !== null && (
          <button
            type="button"
            onClick={onRecord}
            title={recorded ? "Recorded" : "Not recorded yet. Open in Recording."}
            className={cn(
              "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 normal-case tracking-normal",
              recorded
                ? "text-emerald-600"
                : "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20",
            )}
          >
            {recorded ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {recorded ? "audio" : "record"}
          </button>
        )}
      </div>

      {(card.type === "rule" ||
        card.type === "family" ||
        card.type === "check" ||
        card.type === "celebrate" ||
        card.type === "drill") && <p className="font-semibold leading-snug">{card.title}</p>}
      {card.type === "exercise" && <p className="font-semibold leading-snug">{card.prompt}</p>}

      {(card.type === "rule" ? card.example : "arabic" in card && card.type !== "shapes") && (
        <p
          dir="rtl"
          lang="ar"
          className={cn(
            "font-arabic text-center leading-[1.8]",
            card.type === "letter" || card.type === "syllable" ? "text-5xl" : "text-3xl",
            card.type === "ayah" && "text-2xl",
            heavy && "text-amber-600",
          )}
        >
          {card.type === "rule" ? card.example : "arabic" in card ? card.arabic : null}
        </p>
      )}
      {card.type === "shapes" && (
        <div dir="rtl" className="grid grid-cols-4 gap-1 text-center">
          {(["isolated", "initial", "medial", "final"] as const).map((f) => (
            <div key={f} className="rounded-lg bg-secondary/60 py-1">
              <div className="font-arabic text-3xl leading-[1.5]">{card.forms[f]}</div>
              <div dir="ltr" className="text-[10px] text-muted-foreground">
                {f}
              </div>
            </div>
          ))}
        </div>
      )}
      {card.type === "drill" && (
        <div dir="rtl" className="flex flex-wrap gap-1">
          {card.items.map((it) => (
            <span
              key={it.audio}
              className={cn(
                "rounded-md bg-secondary/60 px-1.5 font-arabic text-xl leading-[1.6]",
                it.heavy && "text-amber-600",
                it.qalqala && "text-sky-600",
                it.ghunna && "text-rose-600",
              )}
            >
              {it.arabic}
            </span>
          ))}
        </div>
      )}

      {"translit" in card && (
        <p className="text-center text-sm font-bold text-primary">{card.translit}</p>
      )}
      {card.type === "letter" && <p className="text-center text-sm font-semibold">{card.name}</p>}
      {card.type === "rule" && <p className="text-sm text-muted-foreground">{card.body}</p>}
      {card.type === "rule" && card.teacher && (
        <p className="border-t border-dashed border-border/60 pt-1.5 text-xs text-muted-foreground">
          <b className="text-foreground">Teacher:</b> {card.teacher}
        </p>
      )}
      {(card.type === "family" || card.type === "shapes") && (
        <p className="text-xs text-muted-foreground">{card.body}</p>
      )}
      {card.type === "letter" && <p className="text-xs text-muted-foreground">{card.sound}</p>}
      {card.type === "word" && card.note && (
        <p className="text-xs text-muted-foreground">{card.note}</p>
      )}
      {card.type === "ayah" && (
        <p className="text-center text-xs text-muted-foreground">{card.rules.join(" · ")}</p>
      )}
      {card.type === "exercise" && (
        <p className="text-xs text-muted-foreground">
          {card.items.length} items{card.seconds ? ` · ${card.seconds}s each` : ""}
        </p>
      )}
      {card.type === "check" && (
        <p className="text-xs text-muted-foreground">
          {card.items.map((i) => `${i.count} × ${i.kind.replace(/-/g, " ")}`).join(" · ")} · pass{" "}
          {card.pass}
        </p>
      )}
      {card.type === "celebrate" && (
        <p className="text-sm text-amber-600">{"★".repeat(card.stars)} confetti</p>
      )}
    </div>
  )
}
