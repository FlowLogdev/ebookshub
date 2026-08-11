import { getTextProvider } from "@/lib/ai/text-provider"

/** AI writing assistant actions available in the editor (spec section 16). */
export const WRITING_ASSISTANT_ACTIONS = {
  continue: "Continue writing naturally from where the text leaves off. Match the existing voice and pacing.",
  rewrite: "Rewrite this passage with fresh phrasing while preserving its meaning.",
  improve: "Improve the clarity, flow, and word choice of this passage without changing its meaning.",
  simplify: "Rewrite this passage in simpler language, for an easier reading level.",
  expand: "Expand this passage with more detail, sensory description, or explanation.",
  shorten: "Tighten this passage — say the same thing in noticeably fewer words.",
  grammar: "Correct grammar, spelling, and punctuation only. Do not change style, tone, or wording otherwise.",
  more_descriptive: "Rewrite this passage to be more vivid and descriptive.",
  more_emotional: "Rewrite this passage to carry more emotional weight.",
  more_professional: "Rewrite this passage in a more professional, polished register.",
  summarize: "Summarize this passage in 2-3 sentences.",
} as const

export type WritingAssistantAction = keyof typeof WRITING_ASSISTANT_ACTIONS

export interface WritingAssistantInput {
  action: WritingAssistantAction
  /** The passage to act on — either the user's selection or the full chapter. */
  text: string
  /** Broader chapter context, sent for continuity but not itself rewritten. */
  surroundingContext?: string
  /** Free-text steer from the user, e.g. "make it about a dragon instead". */
  instructions?: string
}

export async function runWritingAssistant(input: WritingAssistantInput): Promise<string> {
  const provider = getTextProvider()
  const instruction = WRITING_ASSISTANT_ACTIONS[input.action]

  const result = await provider.generateText({
    system:
      "You are an expert book editor helping a writer inside their manuscript editor. Return only the rewritten " +
      "or generated passage itself — no preamble, no explanation, no quotation marks around it, no markdown " +
      "headers. Match the language and tone of the surrounding text.",
    prompt: [
      input.surroundingContext ? `Chapter context (for continuity only, do not repeat it back):\n${input.surroundingContext}` : null,
      `Task: ${instruction}`,
      input.instructions ? `Additional instructions from the writer: ${input.instructions}` : null,
      "",
      "Passage to act on:",
      input.text,
    ]
      .filter(Boolean)
      .join("\n\n"),
    maxTokens: 2500,
    temperature: input.action === "grammar" ? 0.2 : 0.8,
  })

  return result.trim()
}
