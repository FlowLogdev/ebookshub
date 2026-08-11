import { NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const { data: chapter, error } = await supabase.from("chapters").select("*").eq("id", id).single()
  if (error || !chapter) return NextResponse.json({ error: error?.message ?? "Chapter not found." }, { status: 404 })
  return NextResponse.json({ chapter })
}

const UpdateChapterSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().nullable().optional(),
  content: z.string().optional(),
  /** Pass true to snapshot the previous content into chapter_versions before overwriting. */
  saveVersion: z.boolean().optional(),
})

/** Autosave endpoint for the editor. Debounce on the client — this writes on every call. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = UpdateChapterSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  const input = parsed.data

  if (input.saveVersion) {
    const { data: existing } = await supabase.from("chapters").select("content, word_count").eq("id", id).single()
    if (existing?.content) {
      await supabase.from("chapter_versions").insert({
        chapter_id: id,
        content: existing.content,
        word_count: existing.word_count,
        label: "Manual edit",
        created_by: user.id,
      })
    }
  }

  const wordCount = input.content ? input.content.trim().split(/\s+/).filter(Boolean).length : undefined

  const { data: chapter, error } = await supabase
    .from("chapters")
    .update({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
      ...(input.content !== undefined ? { content: input.content, word_count: wordCount } : {}),
    })
    .eq("id", id)
    .select()
    .single()

  if (error || !chapter) return NextResponse.json({ error: error?.message ?? "Failed to save." }, { status: 500 })
  return NextResponse.json({ chapter })
}
