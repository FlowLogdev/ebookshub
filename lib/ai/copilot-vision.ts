import Anthropic from "@anthropic-ai/sdk"

// The browser co-pilot's brain (Pro plan). Reads a screenshot of whatever
// page the user is currently on — typically Amazon KDP during account
// setup or book upload — and tells them, in plain language, exactly what
// to click or type next. It never touches the page itself: this is
// look-and-tell guidance only, not an automation/computer-use agent. See
// app/api/copilot/suggest/route.ts and extension/sidepanel.js for the two
// ends of this — the extension captures the screenshot and displays the
// reply, this function is the only thing that "sees" it.
//
// Deliberately calls Anthropic directly rather than going through
// lib/ai/text-router.ts: vision input is Claude-specific here, and (like
// lib/ai/kdp-assistant.ts) this is a support/chat use case, not book
// authorship, so the subject-based provider routing doesn't apply.

export interface CopilotChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface CopilotPageContext {
  url: string
  title: string
  /** data: URI screenshot of the visible tab, captured by the extension's background worker. */
  screenshot?: string
  /** A short plain-text summary of the page's visible content, as a fallback/supplement to the screenshot. */
  pageText?: string
}

export interface CopilotBookContext {
  title: string
  genre?: string | null
  targetAudience?: string | null
}

const SYSTEM_PROMPT = `You are the EbooksHub Browser Assistant, a step-by-step guide that helps authors get through
confusing account-setup and upload flows on third-party publishing sites — most commonly Amazon KDP (Kindle Direct
Publishing), but also others like Draft2Digital, IngramSpark, or a payment/tax verification flow.

You are shown a screenshot (and sometimes a text summary) of the page the user is currently looking at. Your job:
tell them, in plain and specific language, what to do RIGHT NOW on THIS page — which field to fill in, what to
type, which button to click, and why. Reference visible labels, button text, and page sections exactly as they
appear on screen so the user can find them immediately.

Hard rules:
- You cannot see or click anything yourself. Never say "I'll fill this in" or "I clicked X" — you are describing
  what the USER should do, always in second person ("Click...", "Enter...", "Scroll down to...").
- Never ask for or repeat back sensitive data (passwords, full card numbers, SSN/EIN, bank account numbers) even
  if visible in the screenshot — acknowledge the field exists and what it's for without transcribing its value.
- Keep it short: 2-5 sentences or a tight numbered list. This is a live side panel, not an essay.
- If the screenshot is unclear or you're not confident what page this is, say so and ask a clarifying question
  rather than guessing.
- If asked something unrelated to getting set up / publishing on these sites, gently redirect back on topic.`

function parseDataUri(dataUri: string): { mediaType: string; data: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUri)
  if (!match) throw new Error("Screenshot must be a base64 data: URI.")
  return { mediaType: match[1], data: match[2] }
}

export async function getCopilotSuggestion(
  messages: CopilotChatMessage[],
  page: CopilotPageContext,
  book?: CopilotBookContext | null,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set. The browser co-pilot requires Anthropic.")

  const client = new Anthropic({ apiKey })

  const lastMessage = messages[messages.length - 1]
  const priorMessages = messages.slice(0, -1)

  const contextLines = [
    `Current page URL: ${page.url}`,
    `Current page title: ${page.title}`,
    book ? `The user is publishing a book titled "${book.title}"${book.genre ? ` (${book.genre})` : ""}${book.targetAudience ? `, audience: ${book.targetAudience}` : ""}.` : null,
    page.pageText ? `Visible page text (may be truncated):\n${page.pageText.slice(0, 4000)}` : null,
    "",
    `The user's message: ${lastMessage?.content ?? "(no message — just look at the page and suggest the next step)"}`,
  ]
    .filter((line) => line !== null)
    .join("\n")

  const userContent: Anthropic.MessageParam["content"] = []
  if (page.screenshot) {
    const { mediaType, data } = parseDataUri(page.screenshot)
    if (mediaType !== "image/png" && mediaType !== "image/jpeg" && mediaType !== "image/webp" && mediaType !== "image/gif") {
      throw new Error(`Unsupported screenshot format: ${mediaType}`)
    }
    userContent.push({ type: "image", source: { type: "base64", media_type: mediaType, data } })
  }
  userContent.push({ type: "text", text: contextLines })

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
    max_tokens: 700,
    temperature: 0.3,
    system: SYSTEM_PROMPT,
    messages: [...priorMessages.map((m) => ({ role: m.role, content: m.content })), { role: "user" as const, content: userContent }],
  })

  const block = response.content.find((b) => b.type === "text")
  if (!block || block.type !== "text") throw new Error("The co-pilot returned no guidance.")
  return block.text
}
