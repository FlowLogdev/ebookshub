import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BookCard } from '@/components/BookCard'
import { Book } from '@/lib/types'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'

export const revalidate = 60

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!category) notFound()

  const { data: books } = await supabase
    .from('books')
    .select('*, category:categories(*)')
    .eq('category_id', category.id)
    .eq('published', true)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Link href="/categories" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 mb-8 font-medium text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> All Categories
      </Link>
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">{category.name}</h1>
        {category.description && <p className="text-gray-500 text-lg">{category.description}</p>}
      </div>
      {books && books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {books.map((book: Book) => <BookCard key={book.id} book={book} />)}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-xl font-medium">No books in this category yet.</p>
        </div>
      )}
    </div>
  )
}
