"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import ReactMarkdown from "react-markdown"
import { ArrowLeft, ChevronLeft, ChevronRight, ImageIcon, Loader2, PencilLine, Rocket } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { bookTypeById } from "@/lib/book/constants"
import type { Database } from "@/lib/supabase/types"

type Book = Database["public"]["Tables"]["books"]["Row"]
type Chapter = Database["public"]["Tables"]["chapters"]["Row"]
type Cover = Database["public"]["Tables"]["covers"]["Row"]
type BookImage = Database["public"]["Tables"]["images"]["Row"]

export default function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: bookId } = use(params)
  const [book, setBook] = useState<Book | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [covers, setCovers] = useState<Cover[]>([])
  const [images, setImages] = useState<BookImage[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [loading, setLoading] = useState(true)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    fetch(`/api/books/${bookId}`)
      .then((r) => r.json())
      .then((data) => {
        setBook(data.book)
        setChapters(data.chapters)
        setCovers(data.covers)
        setImages(data.images ?? [])
        setLoading(false)
      })
  }, [bookId])

  // "Pages": cover, table of contents, then one page per chapter.
  const pages = useMemo(
    () => [
      { type: "cover" as const },
      { type: "toc" as const },
      ...images.filter((image) => !image.chapter_id).map((image) => ({ type: "artwork" as const, image })),
      ...chapters.map((c) => ({ type: "chapter" as const, chapter: c })),
      { type: "backCover" as const },
    ],
    [chapters, images],
  )

  function goTo(target: number) {
    const clamped = Math.max(0, Math.min(pages.length - 1, target))
    setDirection(clamped >= pageIndex ? 1 : -1)
    setPageIndex(clamped)
  }

  if (loading || !book) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const cover = covers.find((c) => c.id === book.selected_cover_id) ?? covers[0]
  const page = pages[pageIndex]
  const chapterImage = page.type === "chapter" ? images.find((img) => img.chapter_id === page.chapter.id) : undefined

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950">
      <header className="flex h-14 items-center justify-between border-b border-white/10 px-4 text-white">
        <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10 hover:text-white">
          <Link href={`/books/${bookId}/edit`}><ArrowLeft className="h-4 w-4" /> Back to editor</Link>
        </Button>
        <p className="text-sm text-white/70">{book.title} — Preview</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10 hover:text-white">
            <Link href={`/books/${bookId}/publish`}>Publish</Link>
          </Button>
          <Select value={String(pageIndex)} onValueChange={(v) => goTo(Number(v))}>
            <SelectTrigger className="w-48 border-white/20 bg-white/5 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {pages.map((p, i) => (
                <SelectItem key={i} value={String(i)}>
                  {p.type === "cover" ? "Front cover" : p.type === "backCover" ? "Back cover" : p.type === "toc" ? "Table of Contents" : p.type === "artwork" ? "Book artwork" : p.chapter.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center gap-6 p-6">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={() => goTo(pageIndex - 1)} disabled={pageIndex === 0}>
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="relative aspect-[3/4] w-full max-w-lg" style={{ perspective: 2400 }}>
          <div className="pointer-events-none absolute -inset-3 rounded-lg bg-black/40 blur-xl" />
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={pageIndex}
              custom={direction}
              initial={reduceMotion ? false : { rotateY: direction > 0 ? 78 : -78, opacity: 0.4 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={reduceMotion ? undefined : { rotateY: direction > 0 ? -78 : 78, opacity: 0.4 }}
              transition={{ duration: 0.5, ease: [0.34, 1.1, 0.4, 1] }}
              style={{
                transformStyle: "preserve-3d",
                transformOrigin: direction > 0 ? "left center" : "right center",
                backfaceVisibility: "hidden",
              }}
              className="absolute inset-0 overflow-y-auto rounded-md bg-[#fbf8f2] text-neutral-900 shadow-2xl ring-1 ring-black/5"
            >
              {page.type === "cover" && (
                <div className="flex h-full flex-col items-center justify-center p-10 text-center">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover.image_url} alt="" className="mb-6 max-h-72 rounded-md object-cover shadow-lg" />
                  ) : (
                    <div className="mb-6 flex h-64 w-48 items-center justify-center rounded-md bg-neutral-100 text-sm text-neutral-400">
                      No cover generated yet
                    </div>
                  )}
                  <h1 className="font-display text-2xl font-medium">{book.title}</h1>
                  {book.subtitle && <p className="mt-1 text-neutral-500">{book.subtitle}</p>}
                  {book.author_name && <p className="mt-6 text-sm text-neutral-500">by {book.author_name}</p>}
                  {book.front_cover_copy && <p className="mt-5 max-w-sm text-sm leading-relaxed text-neutral-600">{book.front_cover_copy}</p>}
                </div>
              )}

              {page.type === "toc" && (
                <div className="p-10">
                  <h2 className="font-display text-xl font-medium">Table of Contents</h2>
                  <ul className="mt-6 space-y-2 text-sm">
                    {chapters.map((c, i) => (
                      <li key={c.id} className="flex items-center justify-between border-b border-dashed pb-1.5">
                        <button className="text-left hover:underline" onClick={() => goTo(2 + i)}>
                          {c.chapter_number ?? i + 1}. {c.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {page.type === "chapter" && (
                <div className="p-10">
                  <p className="mb-1 text-center text-xs uppercase tracking-[0.2em] text-neutral-400">
                    {bookTypeById(book.book_type).label} · Chapter {page.chapter.chapter_number}
                  </p>
                  <h2 className="text-center font-display text-2xl font-medium">{page.chapter.title}</h2>
                  {page.chapter.subtitle && (
                    <p className="mt-1 text-center text-sm italic text-neutral-500">{page.chapter.subtitle}</p>
                  )}

                  {chapterImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={chapterImage.url}
                      alt=""
                      className="mx-auto mt-6 aspect-square w-full max-w-xs rounded-md object-cover shadow-md"
                    />
                  )}

                  {page.chapter.content ? (
                    <article className="book-page mt-6 font-serif text-[15px] leading-[1.75] text-neutral-800">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="indent-8 first:indent-0">{children}</p>,
                          h1: ({ children }) => <h3 className="mb-2 mt-6 font-display text-lg font-medium">{children}</h3>,
                          h2: ({ children }) => <h3 className="mb-2 mt-6 font-display text-lg font-medium">{children}</h3>,
                          h3: ({ children }) => <h4 className="mb-2 mt-4 font-display text-base font-medium">{children}</h4>,
                        }}
                      >
                        {page.chapter.content}
                      </ReactMarkdown>
                    </article>
                  ) : (
                    <p className="mt-6 text-center text-neutral-400">This chapter hasn&apos;t been written yet.</p>
                  )}
                </div>
              )}

              {page.type === "artwork" && (
                <div className="flex h-full flex-col items-center justify-center p-10 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={page.image.url} alt="Book artwork" className="max-h-[80%] max-w-full rounded-md object-contain shadow-lg" />
                  <p className="mt-5 text-xs uppercase tracking-[0.2em] text-neutral-400">Book artwork</p>
                </div>
              )}

              {page.type === "backCover" && (
                <div className="flex h-full flex-col items-center justify-center p-10 text-center">
                  {covers.find((c) => c.id === book.selected_back_cover_id) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={covers.find((c) => c.id === book.selected_back_cover_id)?.image_url} alt="Back cover" className="mb-6 max-h-72 rounded-md object-cover shadow-lg" />
                  )}
                  {book.back_cover_copy ? <p className="max-w-sm text-sm leading-relaxed text-neutral-700">{book.back_cover_copy}</p> : <p className="text-sm text-neutral-400">Back cover</p>}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={() => goTo(pageIndex + 1)} disabled={pageIndex === pages.length - 1}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <p className="pb-2 text-center text-xs text-white/50">Page {pageIndex + 1} of {pages.length}</p>

      <div className="border-t border-white/10 bg-neutral-900/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-2">
          <Button size="sm" variant="outline" asChild className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
            <Link href={`/books/${bookId}/cover`}><ImageIcon className="h-3.5 w-3.5" /> Design cover</Link>
          </Button>
          <Button size="sm" variant="outline" asChild className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
            <Link href={`/books/${bookId}/cover?side=back`}><ImageIcon className="h-3.5 w-3.5" /> Design back cover</Link>
          </Button>
          <Button size="sm" variant="outline" asChild className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
            <Link href={`/books/${bookId}/edit`}><PencilLine className="h-3.5 w-3.5" /> Edit book</Link>
          </Button>
          <Button size="sm" variant="gold" asChild>
            <Link href={`/books/${bookId}/publish`}><Rocket className="h-3.5 w-3.5" /> Publish</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
