"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { bookTypeById } from "@/lib/book/constants"
import type { Database } from "@/lib/supabase/types"

type Book = Database["public"]["Tables"]["books"]["Row"]
type Chapter = Database["public"]["Tables"]["chapters"]["Row"]
type Cover = Database["public"]["Tables"]["covers"]["Row"]

export default function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: bookId } = use(params)
  const [book, setBook] = useState<Book | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [covers, setCovers] = useState<Cover[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/books/${bookId}`)
      .then((r) => r.json())
      .then((data) => {
        setBook(data.book)
        setChapters(data.chapters)
        setCovers(data.covers)
        setLoading(false)
      })
  }, [bookId])

  // "Pages": cover, table of contents, then one page per chapter.
  const pages = useMemo(
    () => [
      { type: "cover" as const },
      { type: "toc" as const },
      ...chapters.map((c) => ({ type: "chapter" as const, chapter: c })),
    ],
    [chapters],
  )

  if (loading || !book) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const cover = covers.find((c) => c.id === book.selected_cover_id) ?? covers[0]
  const page = pages[pageIndex]

  return (
    <div className="flex min-h-screen flex-col bg-neutral-900">
      <header className="flex h-14 items-center justify-between border-b border-white/10 px-4 text-white">
        <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10 hover:text-white">
          <Link href={`/books/${bookId}/edit`}><ArrowLeft className="h-4 w-4" /> Back to editor</Link>
        </Button>
        <p className="text-sm text-white/70">{book.title} — Preview</p>
        <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10 hover:text-white">
          <Link href={`/books/${bookId}/publish`}>Publish</Link>
        </Button>
        <Select value={String(pageIndex)} onValueChange={(v) => setPageIndex(Number(v))}>
          <SelectTrigger className="w-48 border-white/20 bg-white/5 text-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            {pages.map((p, i) => (
              <SelectItem key={i} value={String(i)}>
                {p.type === "cover" ? "Cover" : p.type === "toc" ? "Table of Contents" : p.chapter.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center gap-6 p-6">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setPageIndex((i) => Math.max(0, i - 1))} disabled={pageIndex === 0}>
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="aspect-[3/4] w-full max-w-lg overflow-y-auto rounded-md bg-white p-10 text-neutral-900 shadow-2xl">
          {page.type === "cover" && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover.image_url} alt="" className="mb-6 max-h-64 rounded-md object-cover shadow-md" />
              ) : (
                <div className="mb-6 flex h-64 w-48 items-center justify-center rounded-md bg-neutral-100 text-sm text-neutral-400">
                  No cover generated yet
                </div>
              )}
              <h1 className="font-display text-2xl font-medium">{book.title}</h1>
              {book.subtitle && <p className="mt-1 text-neutral-500">{book.subtitle}</p>}
              {book.author_name && <p className="mt-6 text-sm text-neutral-500">by {book.author_name}</p>}
            </div>
          )}

          {page.type === "toc" && (
            <div>
              <h2 className="font-display text-xl font-medium">Table of Contents</h2>
              <ul className="mt-6 space-y-2 text-sm">
                {chapters.map((c, i) => (
                  <li key={c.id} className="flex items-center justify-between border-b border-dashed pb-1.5">
                    <button className="text-left hover:underline" onClick={() => setPageIndex(2 + i)}>
                      {c.chapter_number ?? i + 1}. {c.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {page.type === "chapter" && (
            <article className="prose prose-neutral max-w-none prose-headings:font-display">
              <p className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                {bookTypeById(book.book_type).label} · Chapter {page.chapter.chapter_number}
              </p>
              <h2 className="font-display text-xl font-medium">{page.chapter.title}</h2>
              {page.chapter.content ? (
                <ReactMarkdown>{page.chapter.content}</ReactMarkdown>
              ) : (
                <p className="text-neutral-400">This chapter hasn&apos;t been written yet.</p>
              )}
            </article>
          )}
        </div>

        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))} disabled={pageIndex === pages.length - 1}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <p className="pb-4 text-center text-xs text-white/50">Page {pageIndex + 1} of {pages.length}</p>
    </div>
  )
}
