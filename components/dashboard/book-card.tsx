"use client"

import { useState } from "react"
import Link from "next/link"
import { BookOpen, Copy, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { bookTypeById } from "@/lib/book/constants"
import { formatDate } from "@/lib/utils"

export interface DashboardBook {
  id: string
  title: string
  book_type: string
  page_count_target: number
  status: string
  updated_at: string
  covers: { id: string; image_url: string; is_selected: boolean }[]
}

const STATUS_LABEL: Record<string, { label: string; variant: "outline" | "secondary" | "success" | "gold" }> = {
  draft: { label: "Draft", variant: "outline" },
  blueprint_ready: { label: "Outline ready", variant: "secondary" },
  generating: { label: "Generating", variant: "gold" },
  complete: { label: "Complete", variant: "success" },
  published: { label: "Published", variant: "success" },
  archived: { label: "Archived", variant: "outline" },
}

function destinationFor(book: DashboardBook): string {
  if (book.status === "draft" || book.status === "blueprint_ready") return `/books/${book.id}/outline`
  if (book.status === "generating") return `/books/${book.id}/generating`
  if (book.status === "complete" || book.status === "published") return `/books/${book.id}/preview`
  return `/books/${book.id}/edit`
}

export function BookCard({ book, onChanged }: { book: DashboardBook; onChanged: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const cover = book.covers.find((c) => c.is_selected) ?? book.covers[0]
  const status = STATUS_LABEL[book.status] ?? STATUS_LABEL.draft
  const href = destinationFor(book)

  async function duplicate() {
    const res = await fetch(`/api/books/${book.id}/duplicate`, { method: "POST" })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? "Failed to duplicate.")
      return
    }
    toast.success("Book duplicated.")
    onChanged()
  }

  async function remove() {
    const res = await fetch(`/api/books/${book.id}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("Failed to delete.")
      return
    }
    toast.success("Book deleted.")
    setConfirmDelete(false)
    onChanged()
  }

  return (
    <>
      <Card className="group overflow-hidden transition-shadow hover:shadow-lift">
        <Link href={href} className="block">
          <div className="relative flex aspect-[3/4] items-center justify-center bg-gradient-to-br from-primary/15 to-gold/15">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <BookOpen className="h-8 w-8 text-muted-foreground/40" />
            )}
          </div>
        </Link>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <Link href={href} className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-medium">{book.title}</p>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={href}><Pencil className="h-4 w-4" /> Open</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={duplicate}>
                  <Copy className="h-4 w-4" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmDelete(true)} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {bookTypeById(book.book_type).label} · {book.page_count_target} pages
          </p>
          <div className="mt-3 flex items-center justify-between">
            <Badge variant={status.variant}>{status.label}</Badge>
            <span className="text-xs text-muted-foreground">{formatDate(book.updated_at)}</span>
          </div>
        </div>
      </Card>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{book.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the book, its chapters, and any generated images. This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
