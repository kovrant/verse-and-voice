import { Fragment, type ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * A tiny, dependency-free Markdown renderer for article bodies.
 *
 * Supports the subset teachers realistically need:
 *   - # / ## / ### headings
 *   - paragraphs (blank-line separated)
 *   - unordered lists (-, *) and ordered lists (1.)
 *   - > blockquotes
 *   - inline **bold**, *italic*, `code`, and [links](url)
 *
 * It renders everything through React elements (never dangerouslySetInnerHTML),
 * so user/teacher content can't inject HTML — it's safe by construction.
 */

let keySeq = 0
function nextKey(prefix: string) {
  keySeq += 1
  return `${prefix}-${keySeq}`
}

/** Parse inline markdown (bold, italic, code, links) into React nodes. */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  // Order matters: links, then bold, then italic, then inline code.
  const pattern =
    /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={nextKey("t")}>{text.slice(lastIndex, match.index)}</Fragment>)
    }

    if (match[1]) {
      // [label](url)
      nodes.push(
        <a
          key={nextKey("a")}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:opacity-80"
        >
          {match[2]}
        </a>,
      )
    } else if (match[4]) {
      nodes.push(
        <strong key={nextKey("b")} className="font-semibold text-foreground">
          {match[5]}
        </strong>,
      )
    } else if (match[6]) {
      nodes.push(
        <em key={nextKey("i")} className="italic">
          {match[7]}
        </em>,
      )
    } else if (match[8]) {
      nodes.push(
        <code
          key={nextKey("c")}
          className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.85em]"
        >
          {match[9]}
        </code>,
      )
    }

    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={nextKey("t")}>{text.slice(lastIndex)}</Fragment>)
  }

  return nodes
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n")
  const blocks: ReactNode[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Blank line → skip (paragraph separator).
    if (!trimmed) {
      i += 1
      continue
    }

    // Headings.
    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed)
    if (heading) {
      const level = heading[1].length
      const text = heading[2]
      if (level === 1) {
        blocks.push(
          <h2 key={nextKey("h")} className="mt-6 mb-3 text-2xl font-bold text-foreground">
            {renderInline(text)}
          </h2>,
        )
      } else if (level === 2) {
        blocks.push(
          <h3 key={nextKey("h")} className="mt-5 mb-2 text-xl font-bold text-foreground">
            {renderInline(text)}
          </h3>,
        )
      } else {
        blocks.push(
          <h4 key={nextKey("h")} className="mt-4 mb-2 text-lg font-semibold text-foreground">
            {renderInline(text)}
          </h4>,
        )
      }
      i += 1
      continue
    }

    // Blockquote (consecutive > lines).
    if (/^>\s?/.test(trimmed)) {
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""))
        i += 1
      }
      blocks.push(
        <blockquote
          key={nextKey("q")}
          className="my-4 border-l-4 border-primary/40 bg-secondary/40 py-2 pl-4 pr-3 italic text-muted-foreground"
        >
          {renderInline(quote.join(" "))}
        </blockquote>,
      )
      continue
    }

    // Ordered list.
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""))
        i += 1
      }
      blocks.push(
        <ol key={nextKey("ol")} className="my-3 ml-5 list-decimal space-y-1.5 text-foreground/90">
          {items.map((it) => (
            <li key={nextKey("li")}>{renderInline(it)}</li>
          ))}
        </ol>,
      )
      continue
    }

    // Unordered list.
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""))
        i += 1
      }
      blocks.push(
        <ul key={nextKey("ul")} className="my-3 ml-5 list-disc space-y-1.5 text-foreground/90">
          {items.map((it) => (
            <li key={nextKey("li")}>{renderInline(it)}</li>
          ))}
        </ul>,
      )
      continue
    }

    // Paragraph (gather consecutive non-blank, non-special lines).
    const para: string[] = []
    while (i < lines.length) {
      const l = lines[i].trim()
      if (!l || /^(#{1,3})\s+/.test(l) || /^>\s?/.test(l) || /^([-*]|\d+\.)\s+/.test(l)) break
      para.push(l)
      i += 1
    }
    blocks.push(
      <p key={nextKey("p")} className="my-3 leading-relaxed text-foreground/90">
        {renderInline(para.join(" "))}
      </p>,
    )
  }

  return <div className={cn("text-[15px]", className)}>{blocks}</div>
}
