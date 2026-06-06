import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const bookId = session.metadata?.bookId
    const customerEmail = session.customer_details?.email

    if (!bookId || !customerEmail) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const { error } = await supabase.from('orders').insert({
      book_id: bookId,
      customer_email: customerEmail,
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent as string,
      amount: (session.amount_total ?? 0) / 100,
      status: 'completed',
      download_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    if (error) {
      console.error('Order insert error:', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
