import Link from 'next/link'
import Image from 'next/image'
import { Book } from '@/lib/types'
import { ShoppingCart, BookOpen } from 'lucide-react'

export function BookCard({ book }: { book: Book }) {
  return (
    <div className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
      <Link href={`/book/${book.id}`}>
        <div className="relative aspect-[2/3] bg-gradient-to-br from-indigo-100 to-purple-100 overflow-hidden">
          {book.cover_url ? (
            <Image
              src={book.cover_url}
              alt={book.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <BookOpen className="w-16 h-16 text-indigo-300" />
            </div>
          )}
          {book.category && (
            <span className="absolute top-3 left-3 bg-indigo-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
              {book.category.name}
            </span>
          )}
        </div>
      </Link>
      <div className="p-4">
        <Link href={`/book/${book.id}`}>
          <h3 className="font-bold text-gray-900 text-base leading-tight mb-1 hover:text-indigo-700 transition-colors line-clamp-2">
            {book.title}
          </h3>
        </Link>
        <p className="text-sm text-gray-500 mb-1">{book.author}</p>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{book.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-indigo-700">${book.price.toFixed(2)}</span>
          <Link
            href={`/book/${book.id}`}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Buy Now
          </Link>
        </div>
      </div>
    </div>
  )
}
