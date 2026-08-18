import type { ImageBytes } from "@/lib/export/images"

export interface ExportChapter {
  chapterNumber: number | null
  title: string
  subtitle?: string | null
  content: string | null
}

export interface ExportBook {
  title: string
  subtitle?: string | null
  authorName?: string | null
  chapters: ExportChapter[]
  cover?: ImageBytes | null
}
