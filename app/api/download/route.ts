import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const supabase = await createServiceClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('*, book:books(*)')
    .eq('download_token', token)
    .eq('status', 'completed')
    .single()

  if (error || !order) return NextResponse.json({ error: 'Invalid or expired download link' }, { status: 404 })

  if (new Date(order.download_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Download link has expired. Please contact support.' }, { status: 410 })
  }

  const book = order.book
  if (!book?.file_url) {
    return NextResponse.json({ error: 'File not available. Please contact support.' }, { status: 404 })
  }

  // Generate a signed URL from Supabase storage
  const filePath = book.file_url.replace(/.*\/books\//, '')
  const { data: signedUrl, error: signedError } = await supabase.storage
    .from('books')
    .createSignedUrl(filePath, 60)

  if (signedError || !signedUrl) {
    return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 })
  }

  return NextResponse.redirect(signedUrl.signedUrl)
}
