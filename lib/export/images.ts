export interface ImageBytes {
  buffer: Buffer
  mime: string
}

/**
 * Cover images are stored either as data: URIs or hosted URLs (provider-
 * dependent — see app/api/books/[id]/covers/route.ts), so exporters need
 * to handle both. Returns null on any failure so a broken/expired image
 * URL degrades to "no cover" instead of failing the whole export.
 */
export async function resolveImageBytes(url: string | null | undefined): Promise<ImageBytes | null> {
  if (!url) return null
  try {
    if (url.startsWith("data:")) {
      const match = /^data:([^;]+);base64,(.+)$/.exec(url)
      if (!match) return null
      return { buffer: Buffer.from(match[2], "base64"), mime: match[1] }
    }
    const res = await fetch(url)
    if (!res.ok) return null
    const mime = res.headers.get("content-type") ?? "image/png"
    const buffer = Buffer.from(await res.arrayBuffer())
    return { buffer, mime }
  } catch {
    return null
  }
}
