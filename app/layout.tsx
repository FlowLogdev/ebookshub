import type { Metadata } from "next"
import { Fraunces, Inter } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const fontDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
})

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "EbooksHub — Turn your idea into a complete book",
    template: "%s · EbooksHub",
  },
  description:
    "EbooksHub is an AI book creation studio. Describe an idea and get a fully structured book — chapters, illustrations, cover, and every front and back matter page — that you can edit, preview, and export.",
  openGraph: {
    title: "EbooksHub — Turn your idea into a complete book",
    description:
      "Describe your idea. EbooksHub plans, writes, illustrates, and formats a complete book you can edit and export.",
    siteName: "EbooksHub",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EbooksHub — Turn your idea into a complete book",
    description:
      "Describe your idea. EbooksHub plans, writes, illustrates, and formats a complete book you can edit and export.",
  },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontSans.variable}`} suppressHydrationWarning>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
