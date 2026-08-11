/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
