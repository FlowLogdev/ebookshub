import Anthropic from "@anthropic-ai/sdk"
import type { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

/**
 * Text-generation provider abstraction (spec section 45). Every call site in
 * this app goes through `getTextProvider()` rather than importing an SDK
 * directly, so swapping models/vendors later means writing one new class
 * here — not touching the blueprint engine, chapter writer, or editor.
 */

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
  generateText(opts: GenerateTextOptions): Promise<string>
  generateStructuredOutput<T>(opts: GenerateStructuredOptions<T>): Promise<T>
}

class AnthropicTextProvider implements TextGenerationProvider {
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
      throw new Error("The model returned no text content.")
    }
    return block.text
  }

  async generateStructuredOutput<T>(opts: GenerateStructuredOptions<T>): Promise<T> {
    const inputSchema = zodToJsonSchema(opts.schema, { $refStrategy: "none", target: "jsonSchema7" }) as Record<
      string,
      unknown
    >
    // Anthropic's tool input_schema doesn't need (and can choke on) the
    // meta $schema key zod-to-json-schema adds.
    delete inputSchema.$schema

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
      throw new Error(`The model did not return structured output for "${opts.schemaName}".`)
    }

    const parsed = opts.schema.safeParse(toolUse.input)
    if (!parsed.success) {
      throw new Error(`Structured output for "${opts.schemaName}" failed validation: ${parsed.error.message}`)
    }
    return parsed.data
  }
}

let cachedProvider: TextGenerationProvider | null = null

export function getTextProvider(): TextGenerationProvider {
  if (cachedProvider) return cachedProvider

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your environment to enable AI generation (see .env.example).",
    )
  }

  cachedProvider = new AnthropicTextProvider(apiKey)
  return cachedProvider
}
