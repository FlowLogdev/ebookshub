import { z } from "zod"

/**
 * Structured AI output schemas (spec section 46). The model is required to
 * call a tool matching one of these shapes — we never parse prose for
 * anything that becomes application state.
 */

export const BookConceptSchema = z.object({
  title: z.string().describe("A compelling, market-ready book title."),
  subtitle: z.string().optional().describe("An optional subtitle that clarifies the promise of the book."),
  description: z.string().describe("A 2-4 sentence back-cover-style description of the book."),
  genre: z.string(),
  subgenre: z.string().optional(),
  targetAudience: z.string().describe("Who the book is for, e.g. 'Children ages 6-9' or 'Adult beginners'."),
  readingLevel: z.string().describe("e.g. 'Early reader', 'Grade 8', 'Adult general audience'."),
  tone: z.string(),
  writingStyle: z.string(),
  pointOfView: z.string().describe("e.g. 'First person', 'Third person limited'."),
  setting: z.string().describe("Where and when the book takes place, or its subject domain for nonfiction."),
  storyArc: z.string().describe("A short summary of the overall arc or argument of the book."),
  characters: z
    .array(
      z.object({
        name: z.string(),
        role: z.string().describe("e.g. 'Protagonist', 'Mentor', 'Antagonist'."),
        description: z.string(),
      }),
    )
    .default([]),
  keywords: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
})
export type BookConcept = z.infer<typeof BookConceptSchema>

export const MatterSectionSchema = z.object({
  section: z.string().describe("Machine key, e.g. 'title_page', 'dedication', 'glossary'."),
  label: z.string().describe("Human-readable label, e.g. 'Title Page'."),
  pages: z.number().int().min(1),
})
export type MatterSection = z.infer<typeof MatterSectionSchema>

export const BlueprintChapterSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  summary: z.string().describe("2-3 sentences describing what happens / what is covered in this chapter."),
  targetPages: z.number().int().min(1),
})
export type BlueprintChapter = z.infer<typeof BlueprintChapterSchema>

export const BookBlueprintSchema = z.object({
  frontMatter: z.array(MatterSectionSchema),
  chapters: z.array(BlueprintChapterSchema).min(1),
  backMatter: z.array(MatterSectionSchema),
})
export type BookBlueprintDraft = z.infer<typeof BookBlueprintSchema>

export const ChapterContentSchema = z.object({
  content: z.string().describe("The full chapter text in Markdown."),
  summary: z.string().describe("A 2-3 sentence summary of this chapter, for continuity in later chapters."),
  newFacts: z
    .array(
      z.object({
        factType: z.enum(["character", "location", "timeline", "object", "rule", "vocabulary"]),
        subject: z.string(),
        description: z.string(),
      }),
    )
    .default([])
    .describe("Any new characters, places, objects, or established facts introduced in this chapter."),
})
export type ChapterContentResult = z.infer<typeof ChapterContentSchema>
