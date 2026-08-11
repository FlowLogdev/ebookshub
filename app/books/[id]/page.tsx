import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

/** Routes /books/[id] to whichever stage the book is actually in. */
export default async function BookIndexPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: book } = await supabase.from("books").select("status").eq("id", id).single()

  if (!book) redirect("/dashboard")
  if (book.status === "draft" || book.status === "blueprint_ready") redirect(`/books/${id}/outline`)
  if (book.status === "generating") redirect(`/books/${id}/generating`)
  redirect(`/books/${id}/edit`)
}
