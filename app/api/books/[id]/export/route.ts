import { NextResponse } from "next/server"

import { generateBookDocx } from "@/lib/export/docx"
import { generateBookEpub } from "@/lib/export/epub"
import { resolveImageBytes } from "@/lib/export/images"
import { generateBookPdf } from "@/lib/export/pdf"
import type { ExportBook } from "@/lib/export/types"
import { isProPlan, upgradeRequired } from "@/lib/plans/free-tier"
import { createClient } from "@/lib/supabase/server"

const FORMATS = {
  pdf: { contentType: "application/pdf", extension: "pdf" },
  docx: { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "docx" },
  epub: { contentType: "application/epub+zip", extension: "epub" },
} as const

type Format = keyof typeof FORMATS

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "book"
}

/**
 * Downloadable exports (PDF / Word / Kindle-ready EPUB) — Pro plan only.
 * Free and Creator accounts get the in-app preview; this is the premium
 * "take it with you" feature alongside the KDP publishing assistant
 * (see app/api/books/[id]/kdp-assistant/route.ts).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const format = new URL(req.url).searchParams.get("format") as Format | null
  if (!format || !(format in FORMATS)) {
    return NextResponse.json({ error: "format must be one of: pdf, docx, epub" }, { status: 400 })
  }

  const { data: profile, error: profileError } = await supabase.from("profiles").select("plan_id").eq("id", user.id).single()
  if (profileError || !profile) return NextResponse.json({ error: profileError?.message ?? "Failed to load account." }, { status: 500 })
  if (!isProPlan(profile)) {
    return NextResponse.json(upgradeRequired("Downloadable exports are a Pro plan feature. Upgrade to export this book."), { status: 403 })
  }

  const [{ data: book, error: bookError }, { data: chapters }, { data: covers }] = await Promise.all([
    supabase.from("books").select("*").eq("id", id).single(),
    supabase.from("chapters").select("*").eq("book_id", id).order("order_index", { ascending: true }),
    supabase.from("covers").select("*").eq("book_id", id).order("created_at", { ascending: false }),
  ])
  if (bookError || !book) return NextResponse.json({ error: "Book not found." }, { status: 404 })

  const selectedCover = (covers ?? []).find((c) => c.id === book.selected_cover_id) ?? covers?.[0] ?? null
  const cover = await resolveImageBytes(selectedCover?.image_url)

  const exportBook: ExportBook = {
    title: book.title,
    subtitle: book.subtitle,
    authorName: book.author_name,
    cover,
    chapters: (chapters ?? [])
      .filter((c) => c.status === "complete" && c.content)
      .map((c) => ({ chapterNumber: c.chapter_number, title: c.title, subtitle: c.subtitle, content: c.content })),
  }

  if (exportBook.chapters.length === 0) {
    return NextResponse.json({ error: "This book has no finished chapters to export yet." }, { status: 400 })
  }

  try {
    const buffer =
      format === "pdf" ? await generateBookPdf(exportBook) : format === "docx" ? await generateBookDocx(exportBook) : await generateBookEpub(exportBook)

    const { contentType, extension } = FORMATS[format]
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${slugify(book.title)}.${extension}"`,
        "Content-Length": String(buffer.length),
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Export failed." }, { status: 500 })
  }
}
