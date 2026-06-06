import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'EbooksHub — Transformative Books for a Better Life',
  description: 'Discover life-changing ebooks on personal growth, relationships, health, and more.',
  openGraph: {
    title: 'EbooksHub',
    description: 'Discover life-changing ebooks on personal growth, relationships, health, and more.',
    url: 'https://ebookshub.com',
    siteName: 'EbooksHub',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
