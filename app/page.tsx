import { createClient } from '@/lib/supabase/server'
import { BookCard } from '@/components/BookCard'
import { Book, Category } from '@/lib/types'
import Link from 'next/link'
import { ArrowRight, BookOpen, Star, ShieldCheck, Download } from 'lucide-react'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  const { data: books } = await supabase
    .from('books')
    .select('*, category:categories(*)')
    .eq('published', true)
    .order('created_at', { ascending: false })

  const booksByCategory = (categories ?? []).reduce<Record<string, Book[]>>((acc, cat) => {
    acc[cat.id] = (books ?? []).filter((b: Book) => b.category_id === cat.id)
    return acc
  }, {})

  const featuredBook = books?.[0]

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 text-white py-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-700/50 text-indigo-200 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Star className="w-4 h-4 fill-current" />
            Bestselling Ebooks
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            Books That <span className="text-yellow-300">Transform</span> Your Life
          </h1>
          <p className="text-xl text-indigo-200 mb-10 max-w-2xl mx-auto">
            Instantly downloadable ebooks on personal growth, relationships, health & more.
            Start reading in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#books" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-8 py-4 rounded-2xl text-lg transition-colors">
              Browse Books
            </a>
            {featuredBook && (
              <Link href={`/book/${featuredBook.id}`} className="border-2 border-white/40 hover:border-white text-white font-bold px-8 py-4 rounded-2xl text-lg transition-colors">
                Featured Book →
              </Link>
            )}
          </div>
          <div className="mt-12 flex flex-col sm:flex-row gap-6 justify-center text-sm text-indigo-200">
            <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-green-400" /> Secure Stripe Payments</div>
            <div className="flex items-center gap-2"><Download className="w-5 h-5 text-blue-300" /> Instant PDF Download</div>
            <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-yellow-300" /> DRM-Free Files</div>
          </div>
        </div>
      </section>

      {/* Featured Book */}
      {featuredBook && (
        <section className="max-w-5xl mx-auto px-4 py-16">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center border border-indigo-100">
            <div className="flex-shrink-0 w-48 h-72 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden">
              {featuredBook.cover_url ? (
                <img src={featuredBook.cover_url} alt={featuredBook.title} className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="w-20 h-20 text-white/70" />
              )}
            </div>
            <div className="flex-1">
              <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">⭐ Featured Book</span>
              <h2 className="text-3xl font-extrabold text-gray-900 mt-2 mb-3">{featuredBook.title}</h2>
              <p className="text-gray-500 font-medium mb-3">by {featuredBook.author}</p>
              <p className="text-gray-700 leading-relaxed mb-6 line-clamp-4">{featuredBook.description}</p>
              <div className="flex items-center gap-4">
                <span className="text-4xl font-extrabold text-indigo-700">${featuredBook.price.toFixed(2)}</span>
                <Link
                  href={`/book/${featuredBook.id}`}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl text-lg transition-colors"
                >
                  Get This Book <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Books by Category */}
      <section id="books" className="max-w-7xl mx-auto px-4 pb-20">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-10 text-center">All Books</h2>
        {(categories ?? []).map((cat: Category) => {
          const catBooks = booksByCategory[cat.id] ?? []
          if (catBooks.length === 0) return null
          return (
            <div key={cat.id} className="mb-14">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800">{cat.name}</h3>
                <Link href={`/categories/${cat.slug}`} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors">
                  View all <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {catBooks.map((book: Book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            </div>
          )
        })}
        {(!books || books.length === 0) && (
          <div className="text-center py-20 text-gray-400">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-xl font-medium">Books coming soon!</p>
          </div>
        )}
      </section>
    </div>
  )
}
