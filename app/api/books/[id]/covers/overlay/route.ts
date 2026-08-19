import { NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const OverlaySchema = z.object({
  id: z.string(),
  text: z.string(),
  x: z.number(),
  y: z.number(),
  fontSize: z.number(),
  color: z.string(),
  fontFamily: z.string(),
})

const BodySchema = z.object({
  image: z.string().startsWith("data:"),
  overlays: z.array(OverlaySchema),
  variant: z.enum(["with_background", "no_background"]).default("with_background"),
  isBackCover: z.boolean().default(false),
})

/** Saves a text-overlay edit (rendered client-side onto <canvas>) as a new cover row. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const { data: cover, error } = await supabase
    .from("covers")
    .insert({
      book_id: id,
      image_url: parsed.data.image,
      source: "manual",
      variant: parsed.data.variant,
      is_back_cover: parsed.data.isBackCover,
      overlay_text: parsed.data.overlays,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ cover })
}
