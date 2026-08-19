import { NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

async function loadBook(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) } as const
  return { supabase, user } as const
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadBook(id)
  if ("error" in ctx) return ctx.error
  const { supabase } = ctx

  const [{ data: book, error }, { data: blueprint }, { data: chapters }, { data: covers }, { data: characters }, { data: images }] =
    await Promise.all([
      supabase.from("books").select("*").eq("id", id).single(),
      supabase.from("book_blueprints").select("*").eq("book_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("chapters").select("*").eq("book_id", id).order("order_index", { ascending: true }),
      supabase.from("covers").select("*").eq("book_id", id).order("created_at", { ascending: false }),
      supabase.from("characters").select("*").eq("book_id", id).order("created_at", { ascending: true }),
      supabase.from("images").select("*").eq("book_id", id).order("created_at", { ascending: true }),
    ])

  if (error || !book) return NextResponse.json({ error: error?.message ?? "Book not found." }, { status: 404 })

  return NextResponse.json({
    book,
    blueprint,
    chapters: chapters ?? [],
    covers: covers ?? [],
    characters: characters ?? [],
    images: images ?? [],
  })
}

const UpdateBookSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().nullable().optional(),
  authorName: z.string().nullable().optional(),
  status: z.enum(["draft", "blueprint_ready", "generating", "complete", "published", "archived"]).optional(),
  selectedCoverId: z.string().uuid().nullable().optional(),
  selectedBackCoverId: z.string().uuid().nullable().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadBook(id)
  if ("error" in ctx) return ctx.error
  const { supabase } = ctx

  const body = await req.json().catch(() => null)
  const parsed = UpdateBookSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const { data: book, error } = await supabase
    .from("books")
    .update({
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.subtitle !== undefined ? { subtitle: parsed.data.subtitle } : {}),
      ...(parsed.data.authorName !== undefined ? { author_name: parsed.data.authorName } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.selectedCoverId !== undefined ? { selected_cover_id: parsed.data.selectedCoverId } : {}),
      ...(parsed.data.selectedBackCoverId !== undefined ? { selected_back_cover_id: parsed.data.selectedBackCoverId } : {}),
    })
    .eq("id", id)
    .select()
    .single()

  if (error || !book) return NextResponse.json({ error: error?.message ?? "Failed to update book." }, { status: 500 })
  return NextResponse.json({ book })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await loadBook(id)
  if ("error" in ctx) return ctx.error
  const { supabase } = ctx

  const { error } = await supabase.from("books").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
