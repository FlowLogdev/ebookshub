import { BookMarked, Feather, Fingerprint, Globe2, Image as ImageIcon, Layers } from "lucide-react"

import { MAX_PAGE_COUNT, MIN_PAGE_COUNT } from "@/lib/book/constants"

export const STEPS = [
  {
    title: "Describe your idea",
    body: "Type a sentence or a detailed brief. EbooksHub infers genre, audience, tone, and structure from plain language.",
  },
  {
    title: "Review the blueprint",
    body: "See exactly how your page count breaks down: front matter, every chapter, back matter, before anything is written.",
  },
  {
    title: "Watch it get written",
    body: "Chapters are planned, written, and checked for continuity one at a time, with progress you can step away from and return to.",
  },
  {
    title: "Edit, preview, export",
    body: "Fine-tune any page, regenerate a single chapter or cover, then export a print-ready PDF or ePub.",
  },
]

export const CAPABILITIES = [
  {
    icon: Layers,
    title: "Page-accurate blueprints",
    body: "Pick anywhere from 5 to 300 pages. EbooksHub plans front matter, chapters, and back matter to fit, never padded with filler.",
    featured: true,
  },
  {
    icon: Fingerprint,
    title: "Long-form consistency",
    body: "A running Book Bible tracks characters, places, and established facts so chapter 40 still agrees with chapter 4.",
  },
  {
    icon: ImageIcon,
    title: "Illustration & covers",
    body: "Generate cover concepts and page art in a consistent style, grounded in your characters and setting.",
    tinted: true,
  },
  {
    icon: Feather,
    title: "In-editor rewriting",
    body: "Select any passage and continue, rewrite, expand, shorten, or adjust its tone without leaving the editor.",
  },
  {
    icon: Globe2,
    title: "Multilingual by design",
    body: "Write in 12+ languages, with structure-preserving translation for the whole book at once on the roadmap.",
  },
  {
    icon: BookMarked,
    title: "Publishing-ready exports",
    body: "PDF, ePub, and DOCX output that preserves your table of contents, chapter breaks, and page numbers.",
  },
]

export const FAQS = [
  {
    q: "How long can a book be?",
    a: `Anywhere from ${MIN_PAGE_COUNT} to ${MAX_PAGE_COUNT} pages, chosen from a preset list or a custom count. Longer books are planned and written in chapter-sized chunks, not one giant request, so quality holds up across the whole manuscript.`,
  },
  {
    q: "Do I have to accept the AI's first draft?",
    a: "No. Review and edit the blueprint before anything is written, then edit, regenerate, or rewrite any chapter, paragraph, or image afterward. Nothing is locked in.",
  },
  {
    q: "What can I export?",
    a: "Print-ready PDF, ePub, and DOCX, with your table of contents, chapter starts, and page numbers preserved. Cover-only and manuscript-only exports are also available.",
  },
  {
    q: "Who owns what I create?",
    a: "You do. EbooksHub is a tool for producing your book. The words, characters, and artwork you generate and edit are yours.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, from Settings. Cancelling revokes dashboard access immediately. If it's within 7 days of your last charge you're eligible for a full refund — see our refund policy for details.",
  },
]
