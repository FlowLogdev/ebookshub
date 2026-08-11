import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const { data: original, error } = await supabase.from("books").select("*").eq("id", id).single()
  if (error || !original) return NextResponse.json({ error: "Book not found." }, { status: 404 })

  const { id: _originalId, created_at: _c, updated_at: _u, selected_cover_id: _cover, ...rest } = original
  const { data: copy, error: copyError } = await supabase
    .from("books")
    .insert({ ...rest, title: `${original.title} (Copy)` })
    .select()
    .single()
  if (copyError || !copy) return NextResponse.json({ error: copyError?.message ?? "Failed to duplicate." }, { status: 500 })

  const { data: blueprint } = await supabase
    .from("book_blueprints")
    .select("*")
    .eq("book_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  let newBlueprintId: string | null = null
  if (blueprint) {
    const { id: _bid, created_at: _bc, updated_at: _bu, book_id: _bb, ...blueprintRest } = blueprint
    const { data: newBlueprint } = await supabase
      .from("book_blueprints")
      .insert({ ...blueprintRest, book_id: copy.id })
      .select()
      .single()
    newBlueprintId = newBlueprint?.id ?? null
  }

  const { data: chapters } = await supabase.from("chapters").select("*").eq("book_id", id).order("order_index")
  if (chapters && chapters.length > 0) {
    await supabase.from("chapters").insert(
      chapters.map((c) => {
        const { id: _cid, created_at: _cc, updated_at: _cu, book_id: _cb, blueprint_id: _cbp, ...chapterRest } = c
        return { ...chapterRest, book_id: copy.id, blueprint_id: newBlueprintId }
      }),
    )
  }

  return NextResponse.json({ book: copy })
}
