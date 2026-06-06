'use client'
import { useState, useEffect, useRef } from 'react'
import { Book, Category } from '@/lib/types'
import {
  BookOpen, Plus, Pencil, Trash2, Upload, Eye, EyeOff,
  LogOut, Loader2, X, CheckCircle, Package, DollarSign, ShoppingBag
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export function AdminDashboard() {
  const [books, setBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const router = useRouter()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [booksRes, catsRes] = await Promise.all([
      fetch('/api/admin/books').then(r => r.json()),
      fetch('/api/admin/categories').then(r => r.json()),
    ])
    setBooks(Array.isArray(booksRes) ? booksRes : [])
    setCategories(Array.isArray(catsRes) ? catsRes : [])
    setLoading(false)
  }

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    const res = await fetch('/api/admin/books', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) { showToast('Book deleted'); fetchData() }
    else showToast('Failed to delete book', 'error')
  }

  async function togglePublished(book: Book) {
    await fetch('/api/admin/books', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...book, published: !book.published }),
    })
    fetchData()
  }

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.refresh()
  }

  const publishedCount = books.filter(b => b.published).length
  const totalRevenue = 0 // would come from orders

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          <CheckCircle className="w-4 h-4" />
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-none">EbooksHub Admin</h1>
              <p className="text-xs text-gray-500">Store Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" target="_blank" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              View Store ↗
            </a>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-gray-500 hover:text-red-600 text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-gray-900">{books.length}</p>
                <p className="text-sm text-gray-500">Total Books</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-gray-900">{publishedCount}</p>
                <p className="text-sm text-gray-500">Published</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-gray-900">{categories.length}</p>
                <p className="text-sm text-gray-500">Categories</p>
              </div>
            </div>
          </div>
        </div>

        {/* Book List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Books</h2>
            <button
              onClick={() => { setEditingBook(null); setShowForm(true) }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Book
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No books yet. Add your first book!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {books.map(book => (
                <div key={book.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="w-12 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <BookOpen className="w-6 h-6 text-indigo-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{book.title}</p>
                    <p className="text-sm text-gray-500">{book.author} · {book.category?.name ?? 'Uncategorized'}</p>
                    <p className="text-sm font-bold text-indigo-600">${book.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePublished(book)}
                      className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${book.published ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {book.published ? <><Eye className="w-3 h-3" /> Live</> : <><EyeOff className="w-3 h-3" /> Hidden</>}
                    </button>
                    <button
                      onClick={() => { setEditingBook(book); setShowForm(true) }}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(book.id, book.title)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Book Form Modal */}
      {showForm && (
        <BookForm
          book={editingBook}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); fetchData(); showToast(editingBook ? 'Book updated!' : 'Book added!') }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}
    </div>
  )
}

function BookForm({
  book, categories, onClose, onSave, onError
}: {
  book: Book | null
  categories: Category[]
  onClose: () => void
  onSave: () => void
  onError: (msg: string) => void
}) {
  const [form, setForm] = useState({
    title: book?.title ?? '',
    author: book?.author ?? 'Fabio Almeida',
    description: book?.description ?? '',
    price: book?.price?.toString() ?? '',
    category_id: book?.category_id ?? '',
    published: book?.published ?? true,
    cover_url: book?.cover_url ?? '',
    file_url: book?.file_url ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [fileUploading, setFileUploading] = useState(false)
  const coverRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File, type: 'cover' | 'book') {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', type)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data.url as string
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverUploading(true)
    try {
      const url = await uploadFile(file, 'cover')
      setForm(f => ({ ...f, cover_url: url }))
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Cover upload failed')
    } finally { setCoverUploading(false) }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileUploading(true)
    try {
      const url = await uploadFile(file, 'book')
      setForm(f => ({ ...f, file_url: url }))
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'File upload failed')
    } finally { setFileUploading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const method = book ? 'PUT' : 'POST'
    const body = book ? { ...form, id: book.id } : form
    const res = await fetch('/api/admin/books', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) onSave()
    else {
      const data = await res.json()
      onError(data.error || 'Failed to save book')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{book ? 'Edit Book' : 'Add New Book'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Cover upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
              <div
                onClick={() => coverRef.current?.click()}
                className="relative aspect-[2/3] bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 transition-colors overflow-hidden"
              >
                {form.cover_url ? (
                  <img src={form.cover_url} alt="Cover" className="w-full h-full object-cover" />
                ) : coverUploading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-indigo-300 mb-2" />
                    <p className="text-xs text-indigo-400 text-center px-2">Click to upload cover</p>
                  </>
                )}
              </div>
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
            </div>

            {/* Book file upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Book File (PDF)</label>
              <div
                onClick={() => fileRef.current?.click()}
                className="aspect-[2/3] bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                {fileUploading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                ) : form.file_url ? (
                  <>
                    <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
                    <p className="text-xs text-green-600 font-medium text-center px-2">PDF uploaded!</p>
                    <p className="text-xs text-gray-400 mt-1">Click to replace</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-xs text-gray-400 text-center px-2">Click to upload PDF file</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.epub" className="hidden" onChange={handleFileChange} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
            <input
              required
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="Book title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Author *</label>
            <input
              required
              value={form.author}
              onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
              placeholder="Describe what readers will learn..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="19.99"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <select
                value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">No category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.published}
                onChange={e => setForm(f => ({ ...f, published: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-700">Published (visible in store)</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 text-sm"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : book ? 'Update Book' : 'Add Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
