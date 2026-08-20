// Shared vocabulary for the creation wizard, blueprint engine, and editor.
// Keeping these as data (not scattered literals) is what lets the wizard,
// the AI prompts, and the validation layer all agree on the same options.

/** Exact preset page lengths from the product spec, plus a custom 5–300 range. */
export const PAGE_LENGTH_PRESETS = [
  5, 10, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 120, 130, 140, 150, 160, 170, 180, 200, 220, 240, 250, 260, 280, 300,
] as const

export const MIN_PAGE_COUNT = 5
export const MAX_PAGE_COUNT = 300

/** Free tier: one ebook per account, ever — see lib/plans/free-tier.ts. */
export const FREE_TIER_MAX_PAGES = 5
export const FREE_TIER_MAX_WORDS = 1000
export const FREE_TIER_MAX_IMAGES = 0

export type MatterDensity = "illustration_heavy" | "balanced" | "text_heavy"

export interface BookTypeDef {
  id: string
  label: string
  description: string
  /** Guides how the blueprint engine biases front/back matter and pacing. */
  density: MatterDensity
  suggestsGlossary: boolean
  suggestsReferences: boolean
}

export const BOOK_TYPES: BookTypeDef[] = [
  { id: "illustrated_storybook", label: "Illustrated Storybook", description: "A short, image-rich story for reading aloud.", density: "illustration_heavy", suggestsGlossary: false, suggestsReferences: false },
  { id: "childrens_book", label: "Children's Book", description: "Simple language and warm illustrations for young readers.", density: "illustration_heavy", suggestsGlossary: false, suggestsReferences: false },
  { id: "novel", label: "Novel", description: "A full-length work of fiction told across chapters.", density: "text_heavy", suggestsGlossary: false, suggestsReferences: false },
  { id: "nonfiction", label: "Nonfiction Book", description: "Fact-based writing organized around a central subject.", density: "balanced", suggestsGlossary: true, suggestsReferences: true },
  { id: "educational", label: "Educational Book", description: "Lessons, definitions, and exercises for a topic or course.", density: "balanced", suggestsGlossary: true, suggestsReferences: true },
  { id: "biography", label: "Biography", description: "The life story of a real person, told in narrative form.", density: "text_heavy", suggestsGlossary: false, suggestsReferences: true },
  { id: "memoir", label: "Memoir", description: "A personal account of experiences and reflection.", density: "text_heavy", suggestsGlossary: false, suggestsReferences: false },
  { id: "business", label: "Business Book", description: "Frameworks and advice for professionals and founders.", density: "balanced", suggestsGlossary: true, suggestsReferences: true },
  { id: "self_help", label: "Self-Help Book", description: "Practical guidance for personal growth and change.", density: "balanced", suggestsGlossary: false, suggestsReferences: false },
  { id: "cookbook", label: "Cookbook", description: "Recipes with ingredients, steps, and serving notes.", density: "balanced", suggestsGlossary: false, suggestsReferences: false },
  { id: "travel", label: "Travel Book", description: "Guidance and stories about places worth visiting.", density: "balanced", suggestsGlossary: false, suggestsReferences: false },
  { id: "history", label: "History Book", description: "An account of past events, people, and eras.", density: "text_heavy", suggestsGlossary: true, suggestsReferences: true },
  { id: "fantasy", label: "Fantasy Book", description: "Fiction set in an imagined or magical world.", density: "text_heavy", suggestsGlossary: false, suggestsReferences: false },
  { id: "romance", label: "Romance", description: "A story centered on a relationship and its arc.", density: "text_heavy", suggestsGlossary: false, suggestsReferences: false },
  { id: "mystery", label: "Mystery", description: "A plot built around a puzzle to be solved.", density: "text_heavy", suggestsGlossary: false, suggestsReferences: false },
  { id: "sci_fi", label: "Science Fiction", description: "Fiction grounded in speculative science or technology.", density: "text_heavy", suggestsGlossary: false, suggestsReferences: false },
  { id: "poetry", label: "Poetry", description: "A collection of poems around a theme or voice.", density: "balanced", suggestsGlossary: false, suggestsReferences: false },
  { id: "comic", label: "Comic Book", description: "A story told primarily through sequential panel art.", density: "illustration_heavy", suggestsGlossary: false, suggestsReferences: false },
  { id: "activity", label: "Activity Book", description: "Puzzles, prompts, and hands-on pages for engagement.", density: "illustration_heavy", suggestsGlossary: false, suggestsReferences: false },
  { id: "coloring", label: "Coloring Book", description: "Line-art pages designed for coloring in.", density: "illustration_heavy", suggestsGlossary: false, suggestsReferences: false },
  { id: "custom", label: "Custom Book", description: "Something else — describe it and EbooksHub will adapt.", density: "balanced", suggestsGlossary: false, suggestsReferences: false },
]

export const IMAGE_STYLES = [
  "Watercolor", "Children's illustration", "3D animation inspired", "Soft storybook illustration",
  "Digital painting", "Anime", "Manga", "Comic", "Cinematic", "Photorealistic", "Fantasy",
  "Minimalist", "Vintage", "Pencil", "Ink", "Oil painting", "Educational diagram", "Flat vector",
] as const

export const ILLUSTRATION_FREQUENCIES = [
  { id: "none", label: "No illustrations" },
  { id: "cover_only", label: "Cover only" },
  { id: "occasional", label: "Occasional" },
  { id: "every_10", label: "1 image every 10 pages" },
  { id: "every_5", label: "1 image every 5 pages" },
  { id: "every_3", label: "1 image every 3 pages" },
  { id: "every_2", label: "1 image every 2 pages" },
  { id: "every_page", label: "1 image per page" },
  { id: "ai_recommended", label: "AI recommended" },
] as const

export const BOOK_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "pt", label: "Portuguese" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "it", label: "Italian" },
  { code: "de", label: "German" },
  { code: "nl", label: "Dutch" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
] as const

export const BOOK_DIMENSIONS = [
  { id: "6x9", label: "6 × 9 in" },
  { id: "5.5x8.5", label: "5.5 × 8.5 in" },
  { id: "8.5x11", label: "8.5 × 11 in" },
  { id: "8x10", label: "8 × 10 in" },
  { id: "8.5x8.5", label: "8.5 × 8.5 in (square)" },
  { id: "a4", label: "A4" },
  { id: "a5", label: "A5" },
] as const

export function bookTypeById(id: string): BookTypeDef {
  return BOOK_TYPES.find((t) => t.id === id) ?? BOOK_TYPES[BOOK_TYPES.length - 1]
}
