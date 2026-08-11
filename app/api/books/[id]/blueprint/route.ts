import { NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) } as const
  return { supabase } as const
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requireUser()
  if ("error" in ctx) return ctx.error
  const { supabase } = ctx

  const [{ data: blueprint, error }, { data: chapters }] = await Promise.all([
    supabase.from("book_blueprints").select("*").eq("book_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("chapters").select("*").eq("book_id", id).order("order_index", { ascending: true }),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ blueprint, chapters: chapters ?? [] })
}

const MatterSection = z.object({ section: z.string(), label: z.string(), pages: z.number().int().min(1) })
const ChapterEdit = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  targetPages: z.number().int().min(1),
})
const UpdateBlueprintSchema = z.object({
  frontMatter: z.array(MatterSection).optional(),
  backMatter: z.array(MatterSection).optional(),
  chapters: z.array(ChapterEdit).min(1),
})

/**
 * Applies user edits from the blueprint review screen: reorder, add,
 * delete, or resize chapters, and adjust front/back matter (spec section
 * 3). Chapters are matched by id when present; anything without an id is
 * newly added, and any existing chapter missing from the payload is
 * removed — but only if it hasn't been written yet, so approving-then-
 * editing never destroys generated prose.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: bookId } = await params
  const ctx = await requireUser()
  if ("error" in ctx) return ctx.error
  const { supabase } = ctx

  const body = await req.json().catch(() => null)
  const parsed = UpdateBlueprintSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  const input = parsed.data

  const { data: blueprint, error: blueprintError } = await supabase
    .from("book_blueprints")
    .select("*")
    .eq("book_id", bookId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (blueprintError || !blueprint) {
    return NextResponse.json({ error: blueprintError?.message ?? "No blueprint to edit yet." }, { status: 404 })
  }

  const { data: existingChapters } = await supabase.from("chapters").select("id, status").eq("book_id", bookId)
  const keepIds = new Set(input.chapters.map((c) => c.id).filter(Boolean) as string[])
  const toDelete = (existingChapters ?? []).filter((c) => !keepIds.has(c.id) && c.status === "waiting").map((c) => c.id)
  const lockedButOmitted = (existingChapters ?? []).filter((c) => !keepIds.has(c.id) && c.status !== "waiting")

  if (toDelete.length > 0) {
    await supabase.from("chapters").delete().in("id", toDelete)
  }

  for (const [index, chapter] of input.chapters.entries()) {
    if (chapter.id) {
      await supabase
        .from("chapters")
        .update({
          order_index: index,
          chapter_number: index + 1,
          title: chapter.title,
          subtitle: chapter.subtitle ?? null,
          summary: chapter.summary ?? null,
          target_pages: chapter.targetPages,
        })
        .eq("id", chapter.id)
    } else {
      await supabase.from("chapters").insert({
        book_id: bookId,
        blueprint_id: blueprint.id,
        order_index: index,
        chapter_number: index + 1,
        title: chapter.title,
        subtitle: chapter.subtitle ?? null,
        summary: chapter.summary ?? null,
        target_pages: chapter.targetPages,
        status: "waiting",
      })
    }
  }

  const frontMatter = input.frontMatter ?? blueprint.front_matter
  const backMatter = input.backMatter ?? blueprint.back_matter
  const totalPlanned =
    frontMatter.reduce((s, x) => s + x.pages, 0) +
    input.chapters.reduce((s, c) => s + c.targetPages, 0) +
    backMatter.reduce((s, x) => s + x.pages, 0)

  const { data: updatedBlueprint, error: updateError } = await supabase
    .from("book_blueprints")
    .update({ front_matter: frontMatter, back_matter: backMatter, total_pages_planned: totalPlanned })
    .eq("id", blueprint.id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({
    blueprint: updatedBlueprint,
    warning:
      lockedButOmitted.length > 0
        ? `${lockedButOmitted.length} chapter(s) already have content and weren't removed — delete their generated text first if you want to drop them.`
        : null,
  })
}
