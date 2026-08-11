import { NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile, email: user.email })
}

const UpdateProfileSchema = z.object({
  displayName: z.string().nullable().optional(),
  authorName: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  language: z.string().optional(),
})

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const parsed = UpdateProfileSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  const input = parsed.data

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({
      ...(input.displayName !== undefined ? { display_name: input.displayName } : {}),
      ...(input.authorName !== undefined ? { author_name: input.authorName } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.website !== undefined ? { website: input.website } : {}),
      ...(input.language !== undefined ? { language: input.language } : {}),
    })
    .eq("id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile })
}
