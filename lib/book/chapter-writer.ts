import { getTextProviderForBookType } from "@/lib/ai/text-router"
import { bookTypeById } from "@/lib/book/constants"
import { ChapterContentSchema, type BookConcept, type ChapterContentResult } from "@/lib/book/schemas"
import type { Database } from "@/lib/supabase/types"

type Book = Database["public"]["Tables"]["books"]["Row"]
type Chapter = Database["public"]["Tables"]["chapters"]["Row"]
type BookBibleFact = Database["public"]["Tables"]["book_bible_facts"]["Row"]

export interface WriteChapterInput {
  book: Book
  chapter: Chapter
  concept: BookConcept
  /** Summaries of every previously completed chapter, in order — keeps continuity without re-sending full text. */
  previousChapterSummaries: { title: string; summary: string }[]
  /** Grounding facts from the Book Bible: characters, locations, timeline, established rules. */
  bookBibleFacts: BookBibleFact[]
}

/**
 * Writes a single chapter (spec sections 6-7). Never sends the whole book
 * into one context — only this chapter's brief, the concept, and a
 * condensed memory of what's already happened.
 */
export async function writeChapter(input: WriteChapterInput): Promise<ChapterContentResult> {
  const { book, chapter, concept } = input
  const typeDef = bookTypeById(book.book_type)
  const provider = getTextProviderForBookType(book.book_type)

  const factsBySubject = groupFacts(input.bookBibleFacts)

  return provider.generateStructuredOutput({
    schemaName: "chapter_content",
    schema: ChapterContentSchema,
    system: [
      `You are ghostwriting a ${typeDef.label.toLowerCase()} titled "${book.title}".`,
      `Audience: ${concept.targetAudience}. Reading level: ${concept.readingLevel}. Tone: ${concept.tone}.`,
      `Writing style: ${concept.writingStyle}. Point of view: ${concept.pointOfView}. Language: ${book.language}.`,
      "Write only this chapter. Stay strictly consistent with established characters, locations, and facts — " +
        "never contradict them or silently change a name, age, or physical description. If this chapter " +
        "introduces a new character, location, object, or rule that later chapters should remember, list it in " +
        "newFacts.",
      "Do not repeat content from earlier chapters. Do not include placeholder text, TODOs, or meta-commentary — " +
        "only finished prose in Markdown, matching the target length as closely as possible.",
    ].join("\n"),
    prompt: [
      `Book concept: ${concept.description}`,
      `Setting: ${concept.setting}`,
      `Overall arc: ${concept.storyArc}`,
      concept.characters.length
        ? `Characters:\n${concept.characters.map((c) => `- ${c.name} (${c.role}): ${c.description}`).join("\n")}`
        : null,
      Object.keys(factsBySubject).length
        ? `Established facts from earlier chapters (do not contradict these):\n${formatFacts(factsBySubject)}`
        : null,
      input.previousChapterSummaries.length
        ? `Story so far:\n${input.previousChapterSummaries
            .map((s, i) => `${i + 1}. ${s.title}: ${s.summary}`)
            .join("\n")}`
        : "This is the first chapter.",
      "",
      `Now write Chapter ${chapter.chapter_number ?? chapter.order_index}: "${chapter.title}"`,
      chapter.subtitle ? `Subtitle: ${chapter.subtitle}` : null,
      `Chapter brief: ${chapter.summary ?? "Continue the story/subject naturally from where it left off."}`,
      `Target length: approximately ${chapter.target_pages} page(s)` +
        (chapter.target_words ? ` (~${chapter.target_words} words)` : ""),
    ]
      .filter(Boolean)
      .join("\n\n"),
    maxTokens: 8000,
    temperature: 0.85,
  })
}

function groupFacts(facts: BookBibleFact[]): Record<string, BookBibleFact[]> {
  return facts.reduce<Record<string, BookBibleFact[]>>((acc, fact) => {
    ;(acc[fact.fact_type] ??= []).push(fact)
    return acc
  }, {})
}

function formatFacts(bySubject: Record<string, BookBibleFact[]>): string {
  return Object.entries(bySubject)
    .map(([type, facts]) => `${type}:\n${facts.map((f) => `  - ${f.subject}: ${f.description}`).join("\n")}`)
    .join("\n")
}
