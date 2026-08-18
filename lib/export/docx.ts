import { AlignmentType, Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun as DocxTextRun } from "docx"

import { parseMarkdownToBlocks, type TextRun } from "@/lib/export/markdown"
import type { ExportBook } from "@/lib/export/types"

function toDocxRuns(runs: TextRun[]): DocxTextRun[] {
  return runs.map((r) => new DocxTextRun({ text: r.text, bold: r.bold, italics: r.italic }))
}

function imageTypeFromMime(mime: string): "png" | "jpg" | "gif" | "bmp" {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg"
  if (mime.includes("gif")) return "gif"
  if (mime.includes("bmp")) return "bmp"
  return "png"
}

const HEADING_LEVEL = [HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4] as const

/** Renders a complete book to a .docx buffer — title page, optional cover, then one section per chapter. */
export async function generateBookDocx(book: ExportBook): Promise<Buffer> {
  const children: Paragraph[] = []

  if (book.cover) {
    try {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: book.cover.buffer,
              transformation: { width: 400, height: 533 },
              type: imageTypeFromMime(book.cover.mime),
            }),
          ],
        }),
        new Paragraph({ pageBreakBefore: true, children: [] }),
      )
    } catch {
      // Corrupt/unsupported image bytes — skip the cover rather than fail the export.
    }
  }

  children.push(
    new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, text: book.title }),
    ...(book.subtitle ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new DocxTextRun({ text: book.subtitle, italics: true, size: 28 })] })] : []),
    ...(book.authorName ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [new DocxTextRun({ text: `by ${book.authorName}` })] })] : []),
  )

  for (const chapter of book.chapters) {
    const heading = chapter.chapterNumber ? `Chapter ${chapter.chapterNumber}: ${chapter.title}` : chapter.title
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, text: heading }))
    if (chapter.subtitle) {
      children.push(new Paragraph({ children: [new DocxTextRun({ text: chapter.subtitle, italics: true })] }))
    }

    const blocks = chapter.content ? parseMarkdownToBlocks(chapter.content) : []
    for (const block of blocks) {
      if (block.type === "heading") {
        children.push(new Paragraph({ heading: HEADING_LEVEL[Math.min(block.level - 1, 2)], children: toDocxRuns(block.runs) }))
      } else if (block.type === "listItem") {
        children.push(new Paragraph({ bullet: { level: 0 }, children: toDocxRuns(block.runs) }))
      } else {
        children.push(new Paragraph({ spacing: { after: 200 }, children: toDocxRuns(block.runs) }))
      }
    }
  }

  const doc = new Document({ sections: [{ children }] })
  return Packer.toBuffer(doc)
}
