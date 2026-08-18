import { GoogleGenAI } from "@google/genai"
import OpenAI, { toFile } from "openai"

/**
 * Image-generation provider abstraction (spec section 45/10). Three
 * providers are wired in behind a fallback chain — Gemini first, then
 * Higgsfield, then OpenAI — rather than a single fixed provider, so a
 * missing key or an outage on one doesn't block cover/illustration
 * generation. See `generateImageWithFallback`.
 */

export type ImageProviderName = "gemini" | "higgsfield" | "openai"

export interface ReferenceImage {
  /** Raw base64 (no "data:...;base64," prefix). */
  data: string
  mimeType: string
}

export interface GenerateImageOptions {
  prompt: string
  negativePrompt?: string
  /** Rough orientation hint — each provider maps this to its own size/aspect-ratio vocabulary. */
  size?: "1024x1024" | "1024x1536" | "1536x1024"
  count?: number
  /**
   * A user-supplied image to condition generation on (character/style/photo
   * reference — spec: "generate images based on the image I provided").
   * Supported by Gemini (multimodal input) and OpenAI (images.edit); ignored
   * by Higgsfield, which has no image-conditioned endpoint wired up.
   */
  referenceImage?: ReferenceImage
}

export interface GeneratedImage {
  /** Either a hosted URL or a data: URI, depending on what the provider returns. */
  url: string
  revisedPrompt?: string
}

export interface ImageGenerationProvider {
  readonly name: ImageProviderName
  generateImage(opts: GenerateImageOptions): Promise<GeneratedImage[]>
}

function aspectRatioFor(size: GenerateImageOptions["size"]): "1:1" | "2:3" | "3:2" {
  if (size === "1024x1536") return "2:3"
  if (size === "1536x1024") return "3:2"
  return "1:1"
}

type GeminiImageMimeType = "image/png" | "image/jpeg" | "image/webp" | "image/heic" | "image/heif" | "image/gif" | "image/bmp" | "image/tiff"
const GEMINI_IMAGE_MIME_TYPES = new Set<string>(["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif", "image/gif", "image/bmp", "image/tiff"])

/** Falls back to image/png for any upload type Gemini's ImageContent doesn't explicitly list (all common web image types are covered). */
function toGeminiMimeType(mimeType: string): GeminiImageMimeType {
  return GEMINI_IMAGE_MIME_TYPES.has(mimeType) ? (mimeType as GeminiImageMimeType) : "image/png"
}

/** Gemini (Nano Banana 2 / gemini-3.1-flash-image) via the @google/genai Interactions API. 1st choice. */
class GeminiImageProvider implements ImageGenerationProvider {
  readonly name = "gemini" as const
  private client: GoogleGenAI

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey })
  }

  async generateImage(opts: GenerateImageOptions): Promise<GeneratedImage[]> {
    const prompt = opts.negativePrompt ? `${opts.prompt}\n\nAvoid: ${opts.negativePrompt}` : opts.prompt
    const count = opts.count ?? 1

    // With a reference image, the model needs the multimodal input form
    // (image part + text part) instead of a plain prompt string.
    const input: Parameters<typeof this.client.interactions.create>[0]["input"] = opts.referenceImage
      ? [
          { type: "image", data: opts.referenceImage.data, mime_type: toGeminiMimeType(opts.referenceImage.mimeType) },
          { type: "text", text: prompt },
        ]
      : prompt

    const results = await Promise.all(
      Array.from({ length: count }, () =>
        this.client.interactions.create({
          model: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
          input,
          response_format: {
            type: "image",
            mime_type: "image/png",
            aspect_ratio: aspectRatioFor(opts.size),
          },
        }),
      ),
    )

    return results
      .map((interaction) => {
        const image = (interaction as { output_image?: { data?: string; mime_type?: string } }).output_image
        if (!image?.data) return null
        return { url: `data:${image.mime_type || "image/png"};base64,${image.data}` }
      })
      .filter((img): img is GeneratedImage => img !== null)
  }
}

/**
 * Higgsfield (Soul standard model). Async job API: submit, poll status_url
 * until terminal. Request shape is confirmed against Higgsfield's OpenAPI
 * spec; the exact field holding the output image URL on a completed job is
 * NOT fully confirmed from public docs at integration time, so completion
 * parsing is defensive — it searches common field names and throws with the
 * raw payload attached if none match, rather than silently returning a bad
 * URL. Tighten `extractImageUrls` below once you've seen one real response.
 */
class HiggsfieldImageProvider implements ImageGenerationProvider {
  readonly name = "higgsfield" as const

  constructor(
    private readonly keyId: string,
    private readonly keySecret: string,
  ) {}

  private get authHeader() {
    return `Key ${this.keyId}:${this.keySecret}`
  }

  async generateImage(opts: GenerateImageOptions): Promise<GeneratedImage[]> {
    const prompt = opts.negativePrompt ? `${opts.prompt}\n\nAvoid: ${opts.negativePrompt}` : opts.prompt

    const submitRes = await fetch("https://platform.higgsfield.ai/higgsfield-ai/soul/standard", {
      method: "POST",
      headers: { Authorization: this.authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        num_images: opts.count ?? 1,
        resolution: process.env.HIGGSFIELD_RESOLUTION || "2K",
        aspect_ratio: higgsfieldAspectRatio(opts.size),
      }),
    })
    if (!submitRes.ok) {
      throw new Error(`Higgsfield rejected the request (${submitRes.status}): ${await submitRes.text()}`)
    }
    const submitted = (await submitRes.json()) as { status_url?: string; request_id?: string }
    if (!submitted.status_url) {
      throw new Error("Higgsfield did not return a status_url to poll.")
    }

    const terminal = await pollUntilTerminal(submitted.status_url, this.authHeader)
    const urls = extractImageUrls(terminal)
    if (urls.length === 0) {
      throw new Error(
        `Higgsfield job completed but no image URL was found in the response: ${JSON.stringify(terminal).slice(0, 500)}`,
      )
    }
    return urls.map((url) => ({ url }))
  }
}

function higgsfieldAspectRatio(size: GenerateImageOptions["size"]): string {
  if (size === "1024x1536") return "3:4"
  if (size === "1536x1024") return "4:3"
  return "1:1"
}

async function pollUntilTerminal(statusUrl: string, authHeader: string, timeoutMs = 120_000): Promise<unknown> {
  const start = Date.now()
  const terminalFailureStates = new Set(["failed", "error", "canceled", "cancelled"])
  const terminalSuccessStates = new Set(["completed", "complete", "succeeded", "success", "done"])

  while (Date.now() - start < timeoutMs) {
    const res = await fetch(statusUrl, { headers: { Authorization: authHeader } })
    if (!res.ok) throw new Error(`Higgsfield status check failed (${res.status}): ${await res.text()}`)
    const body = (await res.json()) as { status?: string }
    const status = (body.status || "").toLowerCase()

    if (terminalFailureStates.has(status)) {
      throw new Error(`Higgsfield generation failed: ${JSON.stringify(body).slice(0, 500)}`)
    }
    if (terminalSuccessStates.has(status)) {
      return body
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  throw new Error("Higgsfield generation timed out waiting for a result.")
}

/** Best-effort recursive search for URL-looking strings under common output field names. */
function extractImageUrls(payload: unknown): string[] {
  const candidateKeys = new Set(["url", "image_url", "imageUrl"])
  const containerKeys = ["images", "output", "result", "results", "assets", "data"]
  const found: string[] = []

  function walk(node: unknown, depth: number) {
    if (depth > 4 || node == null) return
    if (typeof node === "string" && /^https?:\/\//.test(node)) {
      found.push(node)
      return
    }
    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, depth + 1))
      return
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>
      for (const key of candidateKeys) {
        if (typeof obj[key] === "string") found.push(obj[key] as string)
      }
      for (const key of containerKeys) {
        if (key in obj) walk(obj[key], depth + 1)
      }
    }
  }

  walk(payload, 0)
  return Array.from(new Set(found))
}

/** OpenAI gpt-image-1. Final fallback — the original Phase 1 provider. */
class OpenAIImageProvider implements ImageGenerationProvider {
  readonly name = "openai" as const
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async generateImage(opts: GenerateImageOptions): Promise<GeneratedImage[]> {
    const prompt = opts.negativePrompt ? `${opts.prompt}\n\nAvoid: ${opts.negativePrompt}` : opts.prompt
    const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1"

    const response = opts.referenceImage
      ? await this.client.images.edit({
          model,
          // gpt-image-1 accepts png/webp/jpg for edits; other upload types
          // (gif/bmp/tiff/heic) will fail here and fall through to the next
          // provider in the chain rather than being transcoded.
          image: await toFile(Buffer.from(opts.referenceImage.data, "base64"), "reference", { type: opts.referenceImage.mimeType }),
          prompt,
          size: opts.size ?? "1024x1024",
          n: opts.count ?? 1,
        })
      : await this.client.images.generate({
          model,
          prompt,
          size: opts.size ?? "1024x1024",
          n: opts.count ?? 1,
        })

    return (response.data ?? [])
      .map((item) => ({
        url: item.url ?? (item.b64_json ? `data:image/png;base64,${item.b64_json}` : ""),
        revisedPrompt: item.revised_prompt,
      }))
      .filter((image) => image.url.length > 0)
  }
}

const cachedProviders = new Map<ImageProviderName, ImageGenerationProvider>()

export function isImageProviderConfigured(name: ImageProviderName): boolean {
  if (name === "gemini") return Boolean(process.env.GEMINI_API_KEY)
  if (name === "higgsfield") return Boolean(process.env.HIGGSFIELD_API_KEY_ID && process.env.HIGGSFIELD_API_KEY_SECRET)
  return Boolean(process.env.OPENAI_API_KEY)
}

function getNamedImageProvider(name: ImageProviderName): ImageGenerationProvider {
  const cached = cachedProviders.get(name)
  if (cached) return cached

  let provider: ImageGenerationProvider
  if (name === "gemini") {
    provider = new GeminiImageProvider(process.env.GEMINI_API_KEY!)
  } else if (name === "higgsfield") {
    provider = new HiggsfieldImageProvider(process.env.HIGGSFIELD_API_KEY_ID!, process.env.HIGGSFIELD_API_KEY_SECRET!)
  } else {
    provider = new OpenAIImageProvider(process.env.OPENAI_API_KEY!)
  }

  cachedProviders.set(name, provider)
  return provider
}

/** Priority order: Gemini → Higgsfield → OpenAI, filtered to providers that are actually configured. */
export function getImageProviderChain(): ImageGenerationProvider[] {
  const order: ImageProviderName[] = ["gemini", "higgsfield", "openai"]
  return order.filter(isImageProviderConfigured).map(getNamedImageProvider)
}

export interface ImageGenerationResult {
  images: GeneratedImage[]
  provider: ImageProviderName
}

/**
 * Tries each configured image provider in priority order (Gemini →
 * Higgsfield → OpenAI), moving to the next on any failure. Throws a single
 * aggregate error only if every configured provider failed, or if none are
 * configured at all.
 */
export async function generateImageWithFallback(opts: GenerateImageOptions): Promise<ImageGenerationResult> {
  const chain = getImageProviderChain()
  if (chain.length === 0) {
    throw new Error(
      "No image-generation provider is configured. Set at least one of GEMINI_API_KEY, HIGGSFIELD_API_KEY_ID + HIGGSFIELD_API_KEY_SECRET, or OPENAI_API_KEY.",
    )
  }

  const errors: string[] = []
  for (const provider of chain) {
    try {
      const images = await provider.generateImage(opts)
      if (images.length > 0) return { images, provider: provider.name }
      errors.push(`${provider.name}: returned no images`)
    } catch (err) {
      errors.push(`${provider.name}: ${err instanceof Error ? err.message : "unknown error"}`)
    }
  }

  throw new Error(`All image providers failed:\n${errors.join("\n")}`)
}
