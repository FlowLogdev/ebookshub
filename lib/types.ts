export interface Book {
  id: string
  title: string
  author: string
  description: string
  price: number
  cover_url: string | null
  file_url: string | null
  category_id: string
  category?: Category
  stripe_price_id: string | null
  stripe_product_id: string | null
  published: boolean
  created_at: string
  preview_pages: number
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  created_at: string
}

export interface Order {
  id: string
  book_id: string
  book?: Book
  customer_email: string
  stripe_session_id: string
  stripe_payment_intent: string | null
  amount: number
  status: 'pending' | 'completed' | 'failed'
  download_token: string
  download_expires_at: string
  created_at: string
}
