import { getNamedTextProvider, isTextProviderConfigured, type TextGenerationProvider, type TextProviderName } from "@/lib/ai/text-provider"

/**
 * Default subject → provider routing (spec: "3 AI to generate the books and
 * choose according to the subject"). This is intentionally a plain data
 * table, not embedded logic, so it's a one-line edit to change later:
 *
 *   - Anthropic (Claude): creative/narrative prose — fiction, poetry,
 *     memoir, biography. Strongest at voice, pacing, and long-form
 *     coherence for character-driven writing.
 *   - DeepSeek: structured/analytical content — nonfiction, educational,
 *     business, self-help, cookbooks, history. Strong at organizing dense,
 *     factual material into clear sections.
 *   - OpenAI (GPT): general-purpose default — travel, comics, activity/
 *     coloring books, and anything custom/unclassified.
 */
export const TEXT_PROVIDER_BY_BOOK_TYPE: Record<string, TextProviderName> = {
  illustrated_storybook: "anthropic",
  childrens_book: "anthropic",
  novel: "anthropic",
  nonfiction: "deepseek",
  educational: "deepseek",
  biography: "anthropic",
  memoir: "anthropic",
  business: "deepseek",
  self_help: "deepseek",
  cookbook: "deepseek",
  travel: "openai",
  history: "deepseek",
  fantasy: "anthropic",
  romance: "anthropic",
  mystery: "anthropic",
  sci_fi: "anthropic",
  poetry: "anthropic",
  comic: "openai",
  activity: "openai",
  coloring: "openai",
  custom: "openai",
}

/** Fixed fallback order tried (skipping whichever was already the primary pick) if the preferred provider isn't configured. */
const FALLBACK_ORDER: TextProviderName[] = ["anthropic", "deepseek", "openai"]

export function preferredTextProviderFor(bookTypeId: string): TextProviderName {
  return TEXT_PROVIDER_BY_BOOK_TYPE[bookTypeId] ?? "anthropic"
}

/**
 * Resolves the text provider for a given book type, falling back through
 * the other two configured providers (in a fixed order) if the preferred
 * one's API key isn't set. Throws only when none of the three are configured.
 */
export function getTextProviderForBookType(bookTypeId: string): TextGenerationProvider {
  const preferred = preferredTextProviderFor(bookTypeId)
  const order = [preferred, ...FALLBACK_ORDER.filter((n) => n !== preferred)]

  const configured = order.find(isTextProviderConfigured)
  if (!configured) {
    throw new Error(
      "No text-generation provider is configured. Set at least one of ANTHROPIC_API_KEY, DEEPSEEK_API_KEY, or OPENAI_API_KEY.",
    )
  }
  return getNamedTextProvider(configured)
}
