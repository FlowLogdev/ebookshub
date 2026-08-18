import { NextResponse } from "next/server"

import { deleteConnection } from "@/lib/canva/client"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  await deleteConnection(user.id)
  return NextResponse.json({ ok: true })
}
