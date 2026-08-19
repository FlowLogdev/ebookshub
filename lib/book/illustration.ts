import type { BookConcept } from "@/lib/book/schemas"

/**
 * Decides which chapters get a generated illustration for a given
 * illustration_frequency setting (picked in the creation wizard, spec
 * section 10-11 "Full illustration system" — chapter text generation
 * already existed; this is what actually turns that setting into images).
 * Chapter numbers are 1-indexed.
 */
export function chapterGetsIllustration(frequency: string | null | undefined, chapterNumber: number, totalChapters: number): boolean {
  switch (frequency) {
    case "none":
    case "cover_only":
      return false
    case "every_page":
      return true
    case "every_2":
      return chapterNumber % 2 === 1
    case "every_3":
      return chapterNumber % 3 === 1
    case "every_5":
      return chapterNumber % 5 === 1
    case "every_10":
      return chapterNumber % 10 === 1
    case "occasional":
      return chapterNumber === 1 || chapterNumber % 4 === 0
    case "ai_recommended":
    default:
      // No explicit preference: illustrate the opening and closing chapters
      // plus roughly every third one in between, so even a short book gets
      // more than just a cover.
      return chapterNumber === 1 || chapterNumber === totalChapters || chapterNumber % 3 === 0
  }
}

export interface ChapterIllustrationInput {
  bookTitle: string
  imageStyle?: string | null
  chapterTitle: string
  chapterSummary?: string | null
  concept: Pick<BookConcept, "setting" | "characters" | "tone">
}

/** Builds a cover-consistent illustration prompt for one chapter, grounded in the same concept as the cover. */
export function buildChapterIllustrationPrompt(input: ChapterIllustrationInput): string {
  const mainCharacters = input.concept.characters?.slice(0, 3).map((c) => `${c.name} (${c.description})`).join("; ")
  return [
    `Interior illustration for the chapter "${input.chapterTitle}" of the book "${input.bookTitle}".`,
    input.chapterSummary ? `Scene: ${input.chapterSummary}` : null,
    input.concept.setting ? `Setting: ${input.concept.setting}.` : null,
    mainCharacters ? `Characters that may appear, keep their appearance consistent: ${mainCharacters}.` : null,
    input.concept.tone ? `Tone: ${input.concept.tone}.` : null,
    input.imageStyle ? `Art style: ${input.imageStyle}.` : "Art style: premium, warm, editorial storybook illustration.",
    "Composition: no embedded text or typography. Professional, publishable quality.",
  ]
    .filter(Boolean)
    .join(" ")
}
