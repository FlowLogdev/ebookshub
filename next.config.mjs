/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PDFKit reads its standard-font metrics at runtime from `js/data/*.afm`.
  // Next's file tracer cannot infer those dynamic reads, so keep those files
  // with the serverless export route on Vercel.
  outputFileTracingIncludes: {
    "/api/books/[id]/export": ["./node_modules/pdfkit/js/data/**/*"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "oaidalleapiprodscus.blob.core.windows.net" },
    ],
  },
  eslint: {
    // Lint runs separately in CI; don't block local `next build`.
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
