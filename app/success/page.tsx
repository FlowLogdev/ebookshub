import { createServiceClient } from '@/lib/supabase/server'
import { CheckCircle, Download, BookOpen, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  let order = null
  let book = null

  if (session_id) {
    const supabase = await createServiceClient()
    const { data } = await supabase
      .from('orders')
      .select('*, book:books(*)')
      .eq('stripe_session_id', session_id)
      .eq('status', 'completed')
      .single()
    if (data) {
      order = data
      book = data.book
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Thank you for your purchase!{book ? ` Your copy of "${book.title}" is ready.` : ''}
        </p>

        {order && (
          <div className="bg-indigo-50 rounded-2xl p-5 mb-6 border border-indigo-100">
            <p className="text-sm text-gray-600 mb-4">
              A confirmation has been sent to <strong>{order.customer_email}</strong>
            </p>
            {book?.file_url && (
              <a
                href={`/api/download?token=${order.download_token}`}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition-colors"
              >
                <Download className="w-5 h-5" />
                Download Your Book
              </a>
            )}
            {!book?.file_url && (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-xl p-3">
                Your download link will be emailed to you shortly.
              </p>
            )}
          </div>
        )}

        {!order && (
          <div className="bg-amber-50 rounded-2xl p-5 mb-6 text-sm text-amber-700">
            If your download does not appear, check your email or contact support@ebookshub.com
          </div>
        )}

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Continue Shopping <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
