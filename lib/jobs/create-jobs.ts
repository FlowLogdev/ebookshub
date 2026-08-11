import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase/types"

type TypedClient = SupabaseClient<Database>
type Book = Database["public"]["Tables"]["books"]["Row"]

/** Creates a BLUEPRINT job with a single planning task. */
export async function enqueueBlueprintJob(supabase: TypedClient, book: Book) {
  const { data: job, error: jobError } = await supabase
    .from("generation_jobs")
    .insert({ book_id: book.id, job_type: "BLUEPRINT", status: "queued" })
    .select()
    .single()
  if (jobError || !job) throw jobError ?? new Error("Failed to create blueprint job")

  const { error: taskError } = await supabase.from("generation_tasks").insert({
    job_id: job.id,
    book_id: book.id,
    task_type: "plan_blueprint",
    status: "waiting",
    order_index: 0,
  })
  if (taskError) throw taskError

  return job
}

/**
 * Creates a FULL_BOOK job with one write_chapter task per chapter, in
 * order. Chapters are processed sequentially (order_index ascending) so
 * each one can be grounded in the summaries/facts of everything before it.
 */
export async function enqueueFullBookJob(supabase: TypedClient, book: Book) {
  const { data: chapters, error: chaptersError } = await supabase
    .from("chapters")
    .select("id, order_index")
    .eq("book_id", book.id)
    .order("order_index", { ascending: true })
  if (chaptersError) throw chaptersError
  if (!chapters || chapters.length === 0) {
    throw new Error("Cannot start generation: this book has no chapters yet. Approve a blueprint first.")
  }

  const { data: job, error: jobError } = await supabase
    .from("generation_jobs")
    .insert({ book_id: book.id, job_type: "FULL_BOOK", status: "queued" })
    .select()
    .single()
  if (jobError || !job) throw jobError ?? new Error("Failed to create book generation job")

  const tasks = chapters.map((chapter, i) => ({
    job_id: job.id,
    book_id: book.id,
    chapter_id: chapter.id,
    task_type: "write_chapter",
    status: "waiting" as const,
    order_index: i,
  }))

  const { error: taskError } = await supabase.from("generation_tasks").insert(tasks)
  if (taskError) throw taskError

  // Reset every chapter to "waiting" in case this is a re-run.
  await supabase
    .from("chapters")
    .update({ status: "waiting", error: null })
    .eq("book_id", book.id)

  return job
}

/** Re-queues a single chapter without touching the rest of the book (spec section 31). */
export async function enqueueChapterRetry(supabase: TypedClient, book: Book, chapterId: string) {
  const { data: job, error: jobError } = await supabase
    .from("generation_jobs")
    .insert({ book_id: book.id, job_type: "CHAPTER", status: "queued" })
    .select()
    .single()
  if (jobError || !job) throw jobError ?? new Error("Failed to create chapter retry job")

  const { error: taskError } = await supabase.from("generation_tasks").insert({
    job_id: job.id,
    book_id: book.id,
    chapter_id: chapterId,
    task_type: "write_chapter",
    status: "waiting",
    order_index: 0,
  })
  if (taskError) throw taskError

  await supabase.from("chapters").update({ status: "waiting", error: null }).eq("id", chapterId)

  return job
}
