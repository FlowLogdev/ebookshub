import { NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const SelectSchema = z.object({ coverId: z.string().uuid() })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const parsed = SelectSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "coverId is required." }, { status: 400 })

  await supabase.from("covers").update({ is_selected: false }).eq("book_id", id)
  await supabase.from("covers").update({ is_selected: true }).eq("id", parsed.data.coverId)
  const { error } = await supabase.from("books").update({ selected_cover_id: parsed.data.coverId }).eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
