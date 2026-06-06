'use client'
import Link from 'next/link'
import { BookOpen, ShoppingCart, Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-indigo-700">
            <BookOpen className="w-7 h-7" />
            EbooksHub
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-gray-600 hover:text-indigo-700 font-medium transition-colors">Store</Link>
            <Link href="/categories" className="text-gray-600 hover:text-indigo-700 font-medium transition-colors">Categories</Link>
            <Link href="/about" className="text-gray-600 hover:text-indigo-700 font-medium transition-colors">About</Link>
          </div>

          <button className="md:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          <Link href="/" className="block text-gray-700 font-medium" onClick={() => setOpen(false)}>Store</Link>
          <Link href="/categories" className="block text-gray-700 font-medium" onClick={() => setOpen(false)}>Categories</Link>
          <Link href="/about" className="block text-gray-700 font-medium" onClick={() => setOpen(false)}>About</Link>
        </div>
      )}
    </nav>
  )
}
