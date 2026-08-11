import OpenAI from "openai"

/**
 * Image-generation provider abstraction (spec section 45/10). Illustration
 * types, styles, and the character-consistency system are later phases —
 * this is the plug point they'll build on. Today it powers cover-concept
 * generation only (see app/api/books/[id]/covers/route.ts).
 */

export interface GenerateImageOptions {
  prompt: string
  negativePrompt?: string
  size?: "1024x1024" | "1024x1536" | "1536x1024"
  count?: number
}

export interface GeneratedImage {
  /** Either a hosted URL or a data: URI, depending on what the provider returns. */
  url: string
  revisedPrompt?: string
}

export interface ImageGenerationProvider {
  generateImage(opts: GenerateImageOptions): Promise<GeneratedImage[]>
}

class OpenAIImageProvider implements ImageGenerationProvider {
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async generateImage(opts: GenerateImageOptions): Promise<GeneratedImage[]> {
    const prompt = opts.negativePrompt ? `${opts.prompt}\n\nAvoid: ${opts.negativePrompt}` : opts.prompt

    const response = await this.client.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
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

let cachedProvider: ImageGenerationProvider | null = null

export function getImageProvider(): ImageGenerationProvider {
  if (cachedProvider) return cachedProvider

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to your environment to enable cover/illustration generation.")
  }

  cachedProvider = new OpenAIImageProvider(apiKey)
  return cachedProvider
}
