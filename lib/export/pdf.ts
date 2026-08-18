import PDFDocument from "pdfkit"

import { parseMarkdownToBlocks, type TextRun } from "@/lib/export/markdown"
import type { ExportBook } from "@/lib/export/types"

function fontFor(run: TextRun): string {
  if (run.bold && run.italic) return "Helvetica-BoldOblique"
  if (run.bold) return "Helvetica-Bold"
  if (run.italic) return "Helvetica-Oblique"
  return "Helvetica"
}

function renderRuns(doc: PDFKit.PDFDocument, runs: TextRun[], options: PDFKit.Mixins.TextOptions) {
  runs.forEach((run, i) => {
    doc.font(fontFor(run))
    doc.text(run.text, { ...options, continued: i < runs.length - 1 })
  })
}

/** Renders a complete book to a PDF buffer — title page, optional cover, then one section per chapter. */
export function generateBookPdf(book: ExportBook): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false, margin: 64, size: "LETTER" })
    const chunks: Buffer[] = []
    doc.on("data", (chunk) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    if (book.cover) {
      doc.addPage()
      try {
        doc.image(book.cover.buffer, 0, 0, { fit: [doc.page.width, doc.page.height], align: "center", valign: "center" })
      } catch {
        // Corrupt/unsupported image bytes — skip the cover page rather than fail the export.
      }
    }

    doc.addPage()
    doc.font("Helvetica-Bold").fontSize(28).text(book.title, { align: "center" })
    if (book.subtitle) {
      doc.moveDown(0.5)
      doc.font("Helvetica").fontSize(16).fillColor("#555").text(book.subtitle, { align: "center" })
      doc.fillColor("#000")
    }
    if (book.authorName) {
      doc.moveDown(2)
      doc.font("Helvetica").fontSize(12).text(`by ${book.authorName}`, { align: "center" })
    }

    for (const chapter of book.chapters) {
      doc.addPage()
      const heading = chapter.chapterNumber ? `Chapter ${chapter.chapterNumber}: ${chapter.title}` : chapter.title
      doc.font("Helvetica-Bold").fontSize(20).text(heading)
      if (chapter.subtitle) {
        doc.moveDown(0.3)
        doc.font("Helvetica-Oblique").fontSize(13).fillColor("#555").text(chapter.subtitle)
        doc.fillColor("#000")
      }
      doc.moveDown(1)

      const blocks = chapter.content ? parseMarkdownToBlocks(chapter.content) : []
      for (const block of blocks) {
        if (block.type === "heading") {
          doc.moveDown(0.5)
          doc.fontSize(block.level === 1 ? 16 : block.level === 2 ? 14 : 12)
          renderRuns(doc, block.runs, {})
          doc.moveDown(0.3)
        } else if (block.type === "listItem") {
          doc.fontSize(11)
          doc.text("•  ", { continued: true })
          renderRuns(doc, block.runs, {})
        } else {
          doc.fontSize(11)
          renderRuns(doc, block.runs, { align: "left" })
          doc.moveDown(0.6)
        }
      }
    }

    doc.end()
  })
}
