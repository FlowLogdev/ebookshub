import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import type { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

/**
 * Text-generation provider abstraction (spec section 45). Every call site in
 * this app goes through a provider returned from this module rather than
 * importing an SDK directly, so swapping models/vendors means writing one
 * new class here — not touching the blueprint engine, chapter writer, or
 * editor. Three providers are wired in (Anthropic, DeepSeek, OpenAI); which
 * one writes a given book is decided in lib/ai/text-router.ts.
 */

export type TextProviderName = "anthropic" | "deepseek" | "openai"

export interface GenerateTextOptions {
  system?: string
  prompt: string
  maxTokens?: number
  temperature?: number
  /** "fast" routes to a cheaper/quicker model for low-stakes calls. */
  model?: "default" | "fast"
}

export interface GenerateStructuredOptions<T> extends GenerateTextOptions {
  // Input pinned to `any` (rather than defaulting to T) so T infers from the
  // schema's Output type only — zod's `.default()` fields otherwise make
  // TS infer T from the wider pre-default Input type instead.
  schema: z.ZodType<T, z.ZodTypeDef, any>
  /** Short, stable name for the shape being requested (used as the tool name). */
  schemaName: string
}

export interface TextGenerationProvider {
  readonly name: TextProviderName
  generateText(opts: GenerateTextOptions): Promise<string>
  generateStructuredOutput<T>(opts: GenerateStructuredOptions<T>): Promise<T>
}

function jsonSchemaFor<T>(schema: z.ZodType<T, z.ZodTypeDef, any>): Record<string, unknown> {
  const inputSchema = zodToJsonSchema(schema, { $refStrategy: "none", target: "jsonSchema7" }) as Record<
    string,
    unknown
  >
  // Meta key some providers choke on when it appears inside a tool/function schema.
  delete inputSchema.$schema
  return inputSchema
}

class AnthropicTextProvider implements TextGenerationProvider {
  readonly name = "anthropic" as const
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  private modelFor(kind: GenerateTextOptions["model"] = "default") {
    if (kind === "fast") {
      return process.env.ANTHROPIC_FAST_MODEL || process.env.ANTHROPIC_MODEL || "claude-haiku-4-5"
    }
    return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5"
  }

  async generateText(opts: GenerateTextOptions): Promise<string> {
    const response = await this.client.messages.create({
      model: this.modelFor(opts.model),
      max_tokens: opts.maxTokens ?? 2000,
      temperature: opts.temperature ?? 0.85,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    })

    const block = response.content.find((b) => b.type === "text")
    if (!block || block.type !== "text") {
      throw new Error("Anthropic returned no text content.")
    }
    return block.text
  }

  async generateStructuredOutput<T>(opts: GenerateStructuredOptions<T>): Promise<T> {
    const inputSchema = jsonSchemaFor(opts.schema)

    const response = await this.client.messages.create({
      model: this.modelFor(opts.model),
      max_tokens: opts.maxTokens ?? 8000,
      temperature: opts.temperature ?? 0.5,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
      tools: [
        {
          name: opts.schemaName,
          description: `Return the result as structured data matching the ${opts.schemaName} schema. Always call this tool exactly once with the complete result.`,
          input_schema: inputSchema as Anthropic.Tool["input_schema"],
        },
      ],
      tool_choice: { type: "tool", name: opts.schemaName },
    })

    const toolUse = response.content.find((b) => b.type === "tool_use")
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error(`Anthropic did not return structured output for "${opts.schemaName}".`)
    }

    const parsed = opts.schema.safeParse(toolUse.input)
    if (!parsed.success) {
      throw new Error(`Structured output for "${opts.schemaName}" failed validation: ${parsed.error.message}`)
    }
    return parsed.data
  }
}

/**
 * Shared implementation for any provider that speaks the OpenAI wire
 * format (OpenAI itself, and DeepSeek's OpenAI-compatible endpoint).
 * Structured output goes through tool-calling rather than the newer
 * `response_format: json_schema` feature, since that's the one shape both
 * providers are confirmed to support.
 */
class OpenAICompatibleTextProvider implements TextGenerationProvider {
  private client: OpenAI

  constructor(
    readonly name: TextProviderName,
    apiKey: string,
    private readonly defaultModel: string,
    baseURL?: string,
  ) {
    this.client = new OpenAI({ apiKey, baseURL })
  }

  async generateText(opts: GenerateTextOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.defaultModel,
      max_tokens: opts.maxTokens ?? 2000,
      temperature: opts.temperature ?? 0.85,
      messages: [
        ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
        { role: "user" as const, content: opts.prompt },
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error(`${this.name} returned no text content.`)
    }
    return content
  }

  async generateStructuredOutput<T>(opts: GenerateStructuredOptions<T>): Promise<T> {
    const parameters = jsonSchemaFor(opts.schema)

    const response = await this.client.chat.completions.create({
      model: this.defaultModel,
      max_tokens: opts.maxTokens ?? 8000,
      temperature: opts.temperature ?? 0.5,
      messages: [
        ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
        { role: "user" as const, content: opts.prompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: opts.schemaName,
            description: `Return the result as structured data matching the ${opts.schemaName} schema. Always call this tool exactly once with the complete result.`,
            parameters,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: opts.schemaName } },
    })

    const toolCall = response.choices[0]?.message?.tool_calls?.[0]
    if (!toolCall || toolCall.type !== "function") {
      throw new Error(`${this.name} did not return structured output for "${opts.schemaName}".`)
    }

    let raw: unknown
    try {
      raw = JSON.parse(toolCall.function.arguments)
    } catch {
      throw new Error(`${this.name} returned malformed JSON for "${opts.schemaName}".`)
    }

    const parsed = opts.schema.safeParse(raw)
    if (!parsed.success) {
      throw new Error(`Structured output for "${opts.schemaName}" failed validation: ${parsed.error.message}`)
    }
    return parsed.data
  }
}

const cachedProviders = new Map<TextProviderName, TextGenerationProvider>()

/** Whether a given provider has its required API key configured. */
export function isTextProviderConfigured(name: TextProviderName): boolean {
  if (name === "anthropic") return Boolean(process.env.ANTHROPIC_API_KEY)
  if (name === "deepseek") return Boolean(process.env.DEEPSEEK_API_KEY)
  return Boolean(process.env.OPENAI_API_KEY)
}

/** Resolves (and caches) a specific named text provider. Throws if its API key isn't configured. */
export function getNamedTextProvider(name: TextProviderName): TextGenerationProvider {
  const cached = cachedProviders.get(name)
  if (cached) return cached

  let provider: TextGenerationProvider
  if (name === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set. Add it to your environment (see .env.example).")
    provider = new AnthropicTextProvider(apiKey)
  } else if (name === "deepseek") {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not set. Add it to your environment (see .env.example).")
    provider = new OpenAICompatibleTextProvider(
      "deepseek",
      apiKey,
      process.env.DEEPSEEK_MODEL || "deepseek-v4-pro",
      "https://api.deepseek.com",
    )
  } else {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set. Add it to your environment (see .env.example).")
    provider = new OpenAICompatibleTextProvider("openai", apiKey, process.env.OPENAI_TEXT_MODEL || "gpt-5.6")
  }

  cachedProviders.set(name, provider)
  return provider
}

/** Default provider for call sites that don't care which model writes (e.g. the editor's AI assistant). */
export function getTextProvider(): TextGenerationProvider {
  return getNamedTextProvider("anthropic")
}
