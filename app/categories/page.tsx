import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, ArrowRight } from 'lucide-react'

export const revalidate = 60

const categoryEmojis: Record<string, string> = {
  'self-help': '🌱',
  'health-wellness': '💪',
  'relationships': '❤️',
  'business': '💼',
  'mindfulness': '🧘',
}

export default async function CategoriesPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  const { data: books } = await supabase
    .from('books')
    .select('category_id')
    .eq('published', true)

  const countByCategory = (books ?? []).reduce<Record<string, number>>((acc, b) => {
    if (b.category_id) acc[b.category_id] = (acc[b.category_id] || 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Browse by Category</h1>
        <p className="text-gray-500 text-lg">Find the perfect book for your journey</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {(categories ?? []).map(cat => (
          <Link key={cat.id} href={`/categories/${cat.slug}`}>
            <div className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-200">
              <div className="text-4xl mb-3">{categoryEmojis[cat.slug] ?? '📚'}</div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">{cat.name}</h3>
              {cat.description && <p className="text-gray-500 text-sm mb-3">{cat.description}</p>}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  {countByCategory[cat.id] ?? 0} books
                </span>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
