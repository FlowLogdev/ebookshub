'use client'
import { useState } from 'react'
import { ShoppingCart, Loader2 } from 'lucide-react'

interface Props {
  bookId: string
  bookTitle: string
  price: number
}

export function BuyButton({ bookId, bookTitle, price }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleBuy() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      window.location.href = data.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleBuy}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-8 py-4 rounded-2xl text-lg transition-colors shadow-lg hover:shadow-indigo-200"
      >
        {loading ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
        ) : (
          <><ShoppingCart className="w-5 h-5" /> Buy Now — ${price.toFixed(2)}</>
        )}
      </button>
      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
    </div>
  )
}
