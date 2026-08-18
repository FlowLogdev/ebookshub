// Minimal Markdown -> structured-block parser shared by the PDF, DOCX, and
// EPUB exporters (lib/export/{pdf,docx,epub}.ts). Chapter content coming out
// of the AI pipeline (see lib/book/schemas.ts ChapterContentSchema) only
// ever uses a small subset of Markdown — headings, paragraphs, bold/italic,
// and bullet lists — so a small hand-rolled parser is enough; pulling in a
// full Markdown AST library (remark/unified) for three renderers that each
// need their own primitives anyway wouldn't buy much.

export interface TextRun {
  text: string
  bold?: boolean
  italic?: boolean
}

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; runs: TextRun[] }
  | { type: "paragraph"; runs: TextRun[] }
  | { type: "listItem"; runs: TextRun[] }

// Splits a line into runs, handling bold (double asterisk) and italic (single asterisk or underscore) spans.
export function parseInlineRuns(text: string): TextRun[] {
  const runs: TextRun[] = []
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) runs.push({ text: text.slice(lastIndex, match.index) })
    if (match[2] !== undefined) runs.push({ text: match[2], bold: true })
    else if (match[3] !== undefined) runs.push({ text: match[3], italic: true })
    else if (match[4] !== undefined) runs.push({ text: match[4], italic: true })
    lastIndex = pattern.lastIndex
  }
  if (lastIndex < text.length) runs.push({ text: text.slice(lastIndex) })
  return runs.length > 0 ? runs : [{ text }]
}

export function parseMarkdownToBlocks(markdown: string): Block[] {
  const blocks: Block[] = []
  const lines = markdown.replace(/\r\n/g, "\n").split("\n")
  let paragraphBuffer: string[] = []

  function flushParagraph() {
    if (paragraphBuffer.length === 0) return
    const text = paragraphBuffer.join(" ").trim()
    if (text) blocks.push({ type: "paragraph", runs: parseInlineRuns(text) })
    paragraphBuffer = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (line === "") {
      flushParagraph()
      continue
    }

    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line)
    if (headingMatch) {
      flushParagraph()
      const level = headingMatch[1].length as 1 | 2 | 3
      blocks.push({ type: "heading", level, runs: parseInlineRuns(headingMatch[2]) })
      continue
    }

    const listMatch = /^[-*]\s+(.*)$/.exec(line)
    if (listMatch) {
      flushParagraph()
      blocks.push({ type: "listItem", runs: parseInlineRuns(listMatch[1]) })
      continue
    }

    paragraphBuffer.push(line)
  }
  flushParagraph()

  return blocks
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function runsToHtml(runs: TextRun[]): string {
  return runs
    .map((r) => {
      let t = escapeHtml(r.text)
      if (r.bold) t = `<strong>${t}</strong>`
      if (r.italic) t = `<em>${t}</em>`
      return t
    })
    .join("")
}

/** Renders blocks to XHTML body content for EPUB chapters. */
export function blocksToXhtml(blocks: Block[]): string {
  const out: string[] = []
  let listOpen = false

  for (const block of blocks) {
    if (block.type === "listItem") {
      if (!listOpen) {
        out.push("<ul>")
        listOpen = true
      }
      out.push(`<li>${runsToHtml(block.runs)}</li>`)
      continue
    }
    if (listOpen) {
      out.push("</ul>")
      listOpen = false
    }
    if (block.type === "heading") {
      const tag = `h${block.level + 1}` // chapter title is h1, so in-body headings start at h2
      out.push(`<${tag}>${runsToHtml(block.runs)}</${tag}>`)
    } else {
      out.push(`<p>${runsToHtml(block.runs)}</p>`)
    }
  }
  if (listOpen) out.push("</ul>")

  return out.join("\n")
}

export function markdownToXhtml(markdown: string): string {
  return blocksToXhtml(parseMarkdownToBlocks(markdown))
}
