import type { SupabaseClient } from "@supabase/supabase-js"

import { generateImageWithFallback } from "@/lib/ai/image-provider"
import { generateBookBlueprint, generateBookConcept, blueprintTotalPages, capChapterWords, estimateWordsForPages } from "@/lib/book/blueprint"
import { writeChapter } from "@/lib/book/chapter-writer"
import { bookTypeById, FREE_TIER_MAX_WORDS } from "@/lib/book/constants"
import { buildChapterIllustrationPrompt } from "@/lib/book/illustration"
import type { BookConcept } from "@/lib/book/schemas"
import type { Database } from "@/lib/supabase/types"

type TypedClient = SupabaseClient<Database>

export interface ProcessResult {
  /** True if a task was claimed and processed (whether it succeeded or failed). */
  processed: boolean
  jobId?: string
  taskId?: string
  taskType?: string
  taskStatus?: string
  jobStatus?: string
  error?: string
}

/**
 * Claims and executes exactly one waiting task for the given job, then
 * updates the parent job's status/progress. Call this repeatedly (from the
 * progress screen while mounted, or from a scheduled worker hitting this
 * with JOB_WORKER_SECRET) until it reports the job as no longer running —
 * see /api/jobs/process and README.md for the two calling modes.
 */
export async function processNextTask(supabase: TypedClient, jobId: string): Promise<ProcessResult> {
  const { data: task, error: claimError } = await supabase
    .from("generation_tasks")
    .select("*")
    .eq("job_id", jobId)
    .eq("status", "waiting")
    .order("order_index", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (claimError) throw claimError
  if (!task) {
    const jobStatus = await finalizeJobIfDone(supabase, jobId)
    return { processed: false, jobId, jobStatus }
  }

  await supabase
    .from("generation_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "queued")

  const inProgressStatus = task.task_type === "write_chapter" ? "writing" : "planning"
  await supabase
    .from("generation_tasks")
    .update({ status: inProgressStatus, claimed_at: new Date().toISOString(), attempts: task.attempts + 1 })
    .eq("id", task.id)

  if (task.chapter_id && task.task_type === "write_chapter") {
    await supabase.from("chapters").update({ status: "writing", error: null }).eq("id", task.chapter_id)
  }

  try {
    if (task.task_type === "plan_blueprint") {
      await runPlanBlueprint(supabase, task.book_id)
    } else if (task.task_type === "write_chapter") {
      if (!task.chapter_id) throw new Error("write_chapter task is missing a chapter_id")
      await runWriteChapter(supabase, task.book_id, task.chapter_id)
    } else {
      throw new Error(`Unknown task type: ${task.task_type}`)
    }

    await supabase.from("generation_tasks").update({ status: "complete" }).eq("id", task.id)
    const jobStatus = await finalizeJobIfDone(supabase, jobId)
    return { processed: true, jobId, taskId: task.id, taskType: task.task_type, taskStatus: "complete", jobStatus }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    await supabase.from("generation_tasks").update({ status: "failed", error: message }).eq("id", task.id)
    if (task.chapter_id) {
      await supabase.from("chapters").update({ status: "failed", error: message }).eq("id", task.chapter_id)
    }
    const jobStatus = await finalizeJobIfDone(supabase, jobId)
    return {
      processed: true,
      jobId,
      taskId: task.id,
      taskType: task.task_type,
      taskStatus: "failed",
      jobStatus,
      error: message,
    }
  }
}

async function finalizeJobIfDone(supabase: TypedClient, jobId: string): Promise<string> {
  const { data: tasks } = await supabase.from("generation_tasks").select("status").eq("job_id", jobId)
  if (!tasks || tasks.length === 0) return "queued"

  const total = tasks.length
  const finished = tasks.filter((t) => t.status === "complete" || t.status === "failed").length
  const stillWaiting = tasks.some((t) => t.status === "waiting" || t.status === "planning" || t.status === "writing")
  const progress = Math.round((finished / total) * 100)

  if (stillWaiting) {
    await supabase.from("generation_jobs").update({ progress_percent: progress }).eq("id", jobId)
    return "running"
  }

  const anyFailed = tasks.some((t) => t.status === "failed")
  const { data: job } = await supabase.from("generation_jobs").select("job_type, book_id").eq("id", jobId).single()

  await supabase
    .from("generation_jobs")
    .update({
      status: "complete",
      progress_percent: 100,
      completed_at: new Date().toISOString(),
      error: anyFailed ? `${tasks.filter((t) => t.status === "failed").length} task(s) failed and can be retried.` : null,
    })
    .eq("id", jobId)

  // A FULL_BOOK job finishing with every chapter written is what "the book
  // is done" means — nothing else in this pipeline ever flips books.status
  // to "complete", so without this the dashboard keeps routing back to the
  // generating screen forever even after every chapter succeeded. Leave it
  // on "generating" if any chapter failed, so the user lands back here to retry.
  if (job?.job_type === "FULL_BOOK" && job.book_id && !anyFailed) {
    await supabase.from("books").update({ status: "complete" }).eq("id", job.book_id)
  }

  return "complete"
}

async function runPlanBlueprint(supabase: TypedClient, bookId: string) {
  const { data: book, error } = await supabase.from("books").select("*").eq("id", bookId).single()
  if (error || !book) throw error ?? new Error("Book not found")

  const concept = await generateBookConcept({
    prompt: book.source_prompt ?? book.title,
    bookType: book.book_type,
    language: book.language,
    pageCountTarget: book.page_count_target,
    targetAudience: book.target_audience ?? undefined,
    tone: book.tone ?? undefined,
    isFreeTier: book.is_free_tier,
  })

  const draft = await generateBookBlueprint({
    bookType: book.book_type,
    pageCountTarget: book.page_count_target,
    language: book.language,
    concept,
    isFreeTier: book.is_free_tier,
  })

  const typeDef = bookTypeById(book.book_type)
  const totalPlanned = blueprintTotalPages(draft)

  const { data: blueprint, error: blueprintError } = await supabase
    .from("book_blueprints")
    .insert({
      book_id: bookId,
      concept: concept as unknown as Record<string, unknown>,
      front_matter: draft.frontMatter,
      back_matter: draft.backMatter,
      total_pages_target: book.page_count_target,
      total_pages_planned: totalPlanned,
      approved: false,
    })
    .select()
    .single()
  if (blueprintError || !blueprint) throw blueprintError ?? new Error("Failed to save blueprint")

  const estimatedWords = draft.chapters.map((chapter) => estimateWordsForPages(chapter.targetPages, typeDef.density))
  const targetWords = book.is_free_tier ? capChapterWords(estimatedWords, FREE_TIER_MAX_WORDS) : estimatedWords

  const chapterRows = draft.chapters.map((chapter, i) => ({
    book_id: bookId,
    blueprint_id: blueprint.id,
    order_index: i,
    chapter_number: i + 1,
    title: chapter.title,
    subtitle: chapter.subtitle ?? null,
    summary: chapter.summary,
    target_pages: chapter.targetPages,
    target_words: targetWords[i],
    status: "waiting" as const,
  }))

  const { error: chaptersError } = await supabase.from("chapters").insert(chapterRows)
  if (chaptersError) throw chaptersError

  await supabase
    .from("books")
    .update({
      title: concept.title,
      subtitle: concept.subtitle ?? null,
      genre: concept.genre,
      subgenre: concept.subgenre ?? null,
      target_audience: concept.targetAudience,
      reading_level: concept.readingLevel,
      tone: concept.tone,
      writing_style: concept.writingStyle,
      point_of_view: concept.pointOfView,
      status: "blueprint_ready",
    })
    .eq("id", bookId)
}

async function runWriteChapter(supabase: TypedClient, bookId: string, chapterId: string) {
  const [{ data: book, error: bookError }, { data: chapter, error: chapterError }, { data: blueprint }] =
    await Promise.all([
      supabase.from("books").select("*").eq("id", bookId).single(),
      supabase.from("chapters").select("*").eq("id", chapterId).single(),
      supabase.from("book_blueprints").select("concept").eq("book_id", bookId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ])
  if (bookError || !book) throw bookError ?? new Error("Book not found")
  if (chapterError || !chapter) throw chapterError ?? new Error("Chapter not found")
  const concept = (blueprint?.concept ?? {}) as BookConcept
  if (!concept.title) throw new Error("This book has no approved blueprint yet.")

  const [{ data: previousChapters }, { data: facts }] = await Promise.all([
    supabase
      .from("chapters")
      .select("title, summary, order_index")
      .eq("book_id", bookId)
      .eq("status", "complete")
      .lt("order_index", chapter.order_index)
      .order("order_index", { ascending: true }),
    supabase.from("book_bible_facts").select("*").eq("book_id", bookId),
  ])

  const result = await writeChapter({
    book,
    chapter,
    concept,
    previousChapterSummaries: (previousChapters ?? []).map((c) => ({ title: c.title, summary: c.summary ?? "" })),
    bookBibleFacts: facts ?? [],
  })

  const wordCount = result.content.trim().split(/\s+/).filter(Boolean).length

  await supabase
    .from("chapters")
    .update({ content: result.content, summary: result.summary, word_count: wordCount, error: null })
    .eq("id", chapterId)

  await supabase.from("chapter_versions").insert({
    chapter_id: chapterId,
    content: result.content,
    word_count: wordCount,
    label: "AI generation",
  })

  // The creator's 1–10 artwork slots are fulfilled in chapter order. Uploaded
  // photos already occupy their own slots; AI fills the remaining slots.
  const { count: uploadedCount } = await supabase.from("images").select("id", { count: "exact", head: true }).eq("book_id", bookId).eq("source", "upload")
  const requestedAiSlots = book.image_source === "upload"
    ? 0
    : book.image_source === "mixed"
      ? Math.max(0, book.requested_image_count - (uploadedCount ?? 0))
      : book.requested_image_count
  if (!book.is_free_tier && requestedAiSlots > chapter.order_index) {
    {
      await supabase.from("chapters").update({ status: "illustrating" }).eq("id", chapterId)
      try {
        const prompt = buildChapterIllustrationPrompt({
          bookTitle: book.title,
          imageStyle: book.image_style,
          chapterTitle: chapter.title,
          chapterSummary: result.summary,
          concept,
        })
        const { images, provider } = await generateImageWithFallback({ prompt, size: "1024x1024", count: 1 })
        if (images[0]) {
          await supabase.from("images").insert({
            book_id: bookId,
            chapter_id: chapterId,
            url: images[0].url,
            prompt,
            style: book.image_style,
            aspect_ratio: "1:1",
            provider,
            source: "ai",
            slot_index: (uploadedCount ?? 0) + chapter.order_index,
          })
        }
      } catch (err) {
        // An illustration failing shouldn't fail the chapter's text, which
        // is already saved above — just leave this chapter without one.
        console.error(`Chapter illustration failed for ${chapterId}:`, err)
      }
    }
  }

  await supabase.from("chapters").update({ status: "complete" }).eq("id", chapterId)

  if (result.newFacts.length > 0) {
    await supabase.from("book_bible_facts").insert(
      result.newFacts.map((fact) => ({
        book_id: bookId,
        fact_type: fact.factType,
        subject: fact.subject,
        description: fact.description,
        source_chapter_id: chapterId,
      })),
    )
  }
}
