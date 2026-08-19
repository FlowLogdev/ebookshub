import { NextResponse } from "next/server"
import { z } from "zod"

import { exportDesignAsPng } from "@/lib/canva/design"
import { createClient } from "@/lib/supabase/server"

const BodySchema = z.object({
  designId: z.string().min(1),
  variant: z.enum(["with_background", "no_background"]).default("with_background"),
  isBackCover: z.boolean().default(false),
})

/** Exports a Canva design the user just finished editing and saves it as a new cover. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "designId is required." }, { status: 400 })

  try {
    const { buffer, mime } = await exportDesignAsPng(user.id, parsed.data.designId)
    const imageUrl = `data:${mime};base64,${buffer.toString("base64")}`

    const { data: cover, error } = await supabase
      .from("covers")
      .insert({
        book_id: id,
        image_url: imageUrl,
        source: "canva",
        variant: parsed.data.variant,
        is_back_cover: parsed.data.isBackCover,
      })
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ cover })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to import from Canva." }, { status: 500 })
  }
}
