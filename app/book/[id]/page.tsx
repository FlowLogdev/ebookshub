import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BookOpen, ShieldCheck, Download, ArrowLeft, Star } from 'lucide-react'
import Link from 'next/link'
import { BuyButton } from '@/components/BuyButton'

export const revalidate = 60

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: book } = await supabase
    .from('books')
    .select('*, category:categories(*)')
    .eq('id', id)
    .eq('published', true)
    .single()

  if (!book) notFound()

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 mb-8 font-medium text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Store
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Cover */}
        <div className="flex justify-center">
          <div className="w-72 h-96 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden">
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <BookOpen className="w-28 h-28 text-white/60" />
            )}
          </div>
        </div>

        {/* Details */}
        <div>
          {book.category && (
            <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              {book.category.name}
            </span>
          )}
          <h1 className="text-4xl font-extrabold text-gray-900 leading-tight mb-3">{book.title}</h1>
          <p className="text-gray-500 font-medium text-lg mb-6">by {book.author}</p>

          {/* Rating placeholder */}
          <div className="flex items-center gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ))}
            <span className="text-gray-500 text-sm ml-2">5.0 · Digital Book (PDF)</span>
          </div>

          <p className="text-gray-700 leading-relaxed text-base mb-8">{book.description}</p>

          {/* What you get */}
          <div className="bg-indigo-50 rounded-2xl p-5 mb-8 border border-indigo-100">
            <h3 className="font-bold text-gray-900 mb-3">What you get:</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2"><Download className="w-4 h-4 text-indigo-500" /> Instant PDF download after payment</li>
              <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500" /> DRM-free — read on any device</li>
              <li className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-purple-500" /> Lifetime access to your download link</li>
            </ul>
          </div>

          <div className="flex items-center gap-6 mb-6">
            <span className="text-5xl font-extrabold text-indigo-700">${book.price.toFixed(2)}</span>
          </div>

          <BuyButton bookId={book.id} bookTitle={book.title} price={book.price} />

          <p className="text-xs text-gray-400 mt-4 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Payments are securely processed by Stripe. We never store your card details.
          </p>
        </div>
      </div>
    </div>
  )
}
