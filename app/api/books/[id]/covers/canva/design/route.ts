import { NextResponse } from "next/server"
import { z } from "zod"

import { createCoverDesign, uploadCoverAsset } from "@/lib/canva/design"
import { createClient } from "@/lib/supabase/server"

const BodySchema = z.object({ coverId: z.string().uuid() })

/**
 * Uploads a generated cover as a Canva asset and creates a new design
 * pre-loaded with it, sized for a book cover. Returns the Canva edit URL
 * so the user can open it in a new tab and design freely — the exported
 * result comes back into the app via /canva/import once they're done.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "coverId is required." }, { status: 400 })

  const [{ data: book }, { data: cover }] = await Promise.all([
    supabase.from("books").select("title").eq("id", id).single(),
    supabase.from("covers").select("image_url").eq("id", parsed.data.coverId).eq("book_id", id).single(),
  ])
  if (!book || !cover) return NextResponse.json({ error: "Cover not found." }, { status: 404 })

  try {
    const assetId = await uploadCoverAsset(user.id, cover.image_url, `${book.title} cover`)
    const design = await createCoverDesign(user.id, assetId, `${book.title} — cover`)
    return NextResponse.json({ design })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create Canva design."
    const needsConnect = message.includes("not connected")
    return NextResponse.json({ error: needsConnect ? "Connect Canva first." : message, needsConnect }, { status: needsConnect ? 409 : 500 })
  }
}
