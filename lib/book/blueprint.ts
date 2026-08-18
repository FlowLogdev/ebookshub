import { getFreeTierTextProvider, getTextProviderForBookType } from "@/lib/ai/text-router"
import { bookTypeById } from "@/lib/book/constants"
import {
  BookBlueprintSchema,
  BookConceptSchema,
  type BlueprintChapter,
  type BookBlueprintDraft,
  type BookConcept,
  type MatterSection,
} from "@/lib/book/schemas"

export interface ConceptInput {
  prompt: string
  bookType: string
  language: string
  pageCountTarget: number
  targetAudience?: string
  tone?: string
  /** Free tier: routes to the cheapest configured provider/model instead of the subject-based pick. */
  isFreeTier?: boolean
}

/** Step 1 of the pipeline (spec section 6): turn a free-text idea into a structured concept. */
export async function generateBookConcept(input: ConceptInput): Promise<BookConcept> {
  const typeDef = bookTypeById(input.bookType)
  const provider = input.isFreeTier ? getFreeTierTextProvider() : getTextProviderForBookType(input.bookType)

  return provider.generateStructuredOutput({
    schemaName: "book_concept",
    schema: BookConceptSchema,
    system:
      "You are a senior book editor and publishing strategist. You turn a reader's rough idea into a precise, " +
      "market-ready book concept. Be specific and concrete — never generic placeholders. Match the requested " +
      "language, audience, and book type exactly.",
    prompt: [
      `Book type: ${typeDef.label} (${typeDef.description})`,
      `Target page count: ${input.pageCountTarget} pages`,
      input.targetAudience ? `Requested audience: ${input.targetAudience}` : null,
      input.tone ? `Requested tone: ${input.tone}` : null,
      `Language: ${input.language}`,
      "",
      "Reader's idea:",
      input.prompt,
    ]
      .filter(Boolean)
      .join("\n"),
    maxTokens: 2000,
    temperature: 0.9,
    model: input.isFreeTier ? "fast" : "default",
  })
}

export interface BlueprintInput {
  bookType: string
  pageCountTarget: number
  language: string
  concept: BookConcept
  /** Free tier: cheapest provider/model, and a single Title Page as the only front/back matter. */
  isFreeTier?: boolean
}

const DEFAULT_FRONT_MATTER: Record<string, MatterSection[]> = {
  illustration_heavy: [
    { section: "title_page", label: "Title Page", pages: 1 },
    { section: "dedication", label: "Dedication", pages: 1 },
  ],
  balanced: [
    { section: "title_page", label: "Title Page", pages: 1 },
    { section: "copyright", label: "Copyright Page", pages: 1 },
    { section: "dedication", label: "Dedication", pages: 1 },
    { section: "toc", label: "Table of Contents", pages: 1 },
    { section: "introduction", label: "Introduction", pages: 2 },
  ],
  text_heavy: [
    { section: "title_page", label: "Title Page", pages: 1 },
    { section: "copyright", label: "Copyright Page", pages: 1 },
    { section: "dedication", label: "Dedication", pages: 1 },
    { section: "toc", label: "Table of Contents", pages: 1 },
  ],
}

const DEFAULT_BACK_MATTER: Record<string, MatterSection[]> = {
  illustration_heavy: [{ section: "about_author", label: "About the Author", pages: 1 }],
  balanced: [
    { section: "conclusion", label: "Conclusion", pages: 2 },
    { section: "glossary", label: "Glossary", pages: 2 },
    { section: "about_author", label: "About the Author", pages: 1 },
  ],
  text_heavy: [
    { section: "conclusion", label: "Conclusion", pages: 2 },
    { section: "about_author", label: "About the Author", pages: 1 },
  ],
}

/** Step 2 of the pipeline: allocate the requested page count across front matter, chapters, and back matter. */
export async function generateBookBlueprint(input: BlueprintInput): Promise<BookBlueprintDraft> {
  const typeDef = bookTypeById(input.bookType)
  const provider = input.isFreeTier ? getFreeTierTextProvider() : getTextProviderForBookType(input.bookType)
  // Free-tier books are capped at 5 pages / 1,000 words total — a full front/back matter
  // set (title + copyright + dedication + TOC + intro, etc.) would eat most of that budget
  // before a single word of actual content gets written, so trim it to just a title page.
  const suggestedFront = input.isFreeTier ? [{ section: "title_page", label: "Title Page", pages: 1 }] : DEFAULT_FRONT_MATTER[typeDef.density]
  const suggestedBack = input.isFreeTier ? [] : DEFAULT_BACK_MATTER[typeDef.density]

  const draft = await provider.generateStructuredOutput({
    schemaName: "book_blueprint",
    schema: BookBlueprintSchema,
    system:
      "You are a professional book production planner. Given a book concept and a target page count, you " +
      "produce a realistic, page-accurate blueprint: which front-matter and back-matter sections to include, " +
      "and a chapter-by-chapter outline with a page budget for each chapter. The sum of every section's pages " +
      "(front matter + all chapters + back matter) must be as close as possible to the target page count — " +
      "never pad with filler, and never wildly overshoot or undershoot. Only include sections appropriate for " +
      "this book type; do not add a glossary or references to a novel, for example, unless it genuinely fits." +
      (input.isFreeTier
        ? " This is a short free-trial book — use ONLY the single Title Page listed below as front matter and " +
          "NO back matter at all, so almost every page goes to the actual chapters."
        : ""),
    prompt: [
      `Book type: ${typeDef.label} — content density: ${typeDef.density.replace("_", " ")}`,
      typeDef.suggestsGlossary && !input.isFreeTier ? "This book type commonly benefits from a glossary." : null,
      typeDef.suggestsReferences && !input.isFreeTier ? "This book type commonly benefits from references/resources." : null,
      `Target total page count: ${input.pageCountTarget}`,
      `Language: ${input.language}`,
      "",
      input.isFreeTier ? "Front matter to use exactly as given:" : "Typical front matter for this type of book (adjust as needed):",
      JSON.stringify(suggestedFront),
      input.isFreeTier ? "Back matter to use exactly as given:" : "Typical back matter for this type of book (adjust as needed):",
      JSON.stringify(suggestedBack),
      "",
      "Book concept:",
      JSON.stringify(input.concept, null, 2),
    ]
      .filter(Boolean)
      .join("\n"),
    maxTokens: 4000,
    temperature: 0.6,
    model: input.isFreeTier ? "fast" : "default",
  })

  return normalizeBlueprintPages(draft, input.pageCountTarget)
}

/**
 * The model's page math is usually close but rarely exact. Rather than
 * accept drift or pad with blank pages, proportionally rescale chapter page
 * budgets (front/back matter stay fixed — they're closer to constants) so
 * the total lands within a page or two of the target.
 */
export function normalizeBlueprintPages(draft: BookBlueprintDraft, pageCountTarget: number): BookBlueprintDraft {
  const frontTotal = sumPages(draft.frontMatter)
  const backTotal = sumPages(draft.backMatter)
  const chapterTotal = draft.chapters.reduce((sum, c) => sum + c.targetPages, 0)

  const budgetForChapters = Math.max(pageCountTarget - frontTotal - backTotal, draft.chapters.length)
  if (chapterTotal === 0) return draft

  const scale = budgetForChapters / chapterTotal
  let rescaled: BlueprintChapter[] = draft.chapters.map((c) => ({
    ...c,
    targetPages: Math.max(1, Math.round(c.targetPages * scale)),
  }))

  // Rounding can leave us off by a page or two — correct by nudging the
  // longest chapter, which is the least noticeable place to absorb drift.
  let drift = budgetForChapters - rescaled.reduce((sum, c) => sum + c.targetPages, 0)
  if (drift !== 0 && rescaled.length > 0) {
    const idx = rescaled.reduce((maxIdx, c, i) => (c.targetPages > rescaled[maxIdx].targetPages ? i : maxIdx), 0)
    rescaled = rescaled.map((c, i) => (i === idx ? { ...c, targetPages: Math.max(1, c.targetPages + drift) } : c))
    drift = 0
  }

  return { ...draft, chapters: rescaled }
}

function sumPages(sections: MatterSection[]): number {
  return sections.reduce((sum, s) => sum + s.pages, 0)
}

export function blueprintTotalPages(draft: BookBlueprintDraft): number {
  return sumPages(draft.frontMatter) + draft.chapters.reduce((sum, c) => sum + c.targetPages, 0) + sumPages(draft.backMatter)
}

/** Rough words-per-page used to derive a word-count target from a page target (spec section 67). */
export function estimateWordsForPages(pages: number, density: "illustration_heavy" | "balanced" | "text_heavy"): number {
  const wordsPerPage = density === "illustration_heavy" ? 60 : density === "balanced" ? 280 : 380
  return pages * wordsPerPage
}

/**
 * Rescales a set of per-chapter word targets so they sum to at most `totalWordCap`
 * (used to enforce the free tier's 1,000-word ceiling regardless of what the
 * density-based per-page estimate would otherwise produce). Every chapter keeps a
 * floor of 40 words so short chapters don't get scaled down to nothing.
 */
export function capChapterWords(wordTargets: number[], totalWordCap: number): number[] {
  const total = wordTargets.reduce((sum, w) => sum + w, 0)
  if (total <= totalWordCap || total === 0) return wordTargets

  const floor = 40
  const scale = totalWordCap / total
  return wordTargets.map((w) => Math.max(floor, Math.round(w * scale)))
}
