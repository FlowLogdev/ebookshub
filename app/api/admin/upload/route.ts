import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('admin_session')?.value === 'authenticated'
  if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  const type = formData.get('type') as string // 'cover' or 'book'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const supabase = await createServiceClient()
  const bucket = type === 'cover' ? 'covers' : 'books'
  const ext = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (type === 'cover') {
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
    return NextResponse.json({ url: urlData.publicUrl })
  }

  // For book files, return the storage path (not public URL)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  return NextResponse.json({ url: `${supabaseUrl}/storage/v1/object/books/${data.path}` })
}
