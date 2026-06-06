import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { bookId } = await req.json()
    if (!bookId) return NextResponse.json({ error: 'Missing bookId' }, { status: 400 })

    const supabase = await createServiceClient()
    const { data: book, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .eq('published', true)
      .single()

    if (error || !book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(book.price * 100),
            product_data: {
              name: book.title,
              description: book.description?.slice(0, 200),
              images: book.cover_url ? [book.cover_url] : [],
              metadata: { bookId: book.id },
            },
          },
        },
      ],
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/book/${book.id}`,
      metadata: { bookId: book.id },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
