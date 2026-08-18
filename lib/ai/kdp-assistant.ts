import OpenAI from "openai"

// The Pro-tier "publish on Amazon Kindle" assistant. Amazon has no public
// API for KDP (Kindle Direct Publishing) uploads, so this is guidance, not
// automation — an OpenAI-powered chat that walks the user through the
// KDP.com flow step by step while they do the actual clicking on Amazon's
// site. Always uses OpenAI directly (not the multi-provider text router)
// since this is a support/chat use case, not book authorship.

export interface KdpChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface KdpBookContext {
  title: string
  subtitle?: string | null
  genre?: string | null
  description?: string | null
  targetAudience?: string | null
  pageCountTarget: number
  keywords?: string[]
  categories?: string[]
}

const SYSTEM_PROMPT = `You are the EbooksHub Kindle Publishing Assistant, an expert guide to Amazon Kindle Direct
Publishing (KDP). You help authors take a finished book and actually publish it on Amazon — but you have no
ability to log in, click, or upload anything on Amazon's site yourself. You give clear, step-by-step guidance and
the user performs each step themselves at kdp.amazon.com.

Cover, concretely and accurately, whichever of these the user's question touches:
1. Creating/signing in to a KDP account (kdp.amazon.com), including tax interview and payment info requirements.
2. Book details: title, subtitle, series, edition, author/contributors, description, language, publishing rights,
   keywords (up to 7), categories (2 BISAC categories, more via KDP support), age/grade range if relevant.
3. Manuscript upload: KDP accepts EPUB or Word (.docx) directly — the user can download either straight from
   EbooksHub's book preview page. Mention Kindle Create only if they want extra formatting control.
4. Kindle e-book cover: dimensions/requirements, and that EbooksHub's generated cover can be downloaded and
   uploaded as-is or used as a starting point in KDP's cover creator.
5. Pricing & royalty: 35% vs 70% royalty plans, 70% plan requirements (price range, territories, delivery cost),
   KDP Select (Kindle Unlimited enrollment, 90-day exclusivity trade-off).
6. Pre-order options, publishing/review timeline (usually 24-72 hours), and what to check after it goes live.

Be concise and practical — short paragraphs or numbered steps, not walls of text. When the book's own details
(title, genre, description, audience, page count) are relevant to a recommendation (e.g. suggesting categories,
keywords, or a royalty plan), use them naturally. Never claim you can perform an action on Amazon's site — always
frame it as "next, you'll..." guidance. If asked something outside KDP publishing, gently redirect to KDP topics.`

function contextBlock(book: KdpBookContext): string {
  return [
    `Book title: ${book.title}${book.subtitle ? ` — ${book.subtitle}` : ""}`,
    book.genre ? `Genre: ${book.genre}` : null,
    book.description ? `Description: ${book.description}` : null,
    book.targetAudience ? `Target audience: ${book.targetAudience}` : null,
    `Length: ${book.pageCountTarget} pages`,
    book.keywords?.length ? `Suggested keywords: ${book.keywords.join(", ")}` : null,
    book.categories?.length ? `Suggested categories: ${book.categories.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n")
}

export async function chatWithKdpAssistant(messages: KdpChatMessage[], book: KdpBookContext): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set. The KDP publishing assistant requires OpenAI.")

  const client = new OpenAI({ apiKey })
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL || "gpt-5.6",
    temperature: 0.4,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: `Context about the book being published:\n${contextBlock(book)}` },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  })

  const reply = response.choices[0]?.message?.content
  if (!reply) throw new Error("The KDP assistant returned an empty response.")
  return reply
}
