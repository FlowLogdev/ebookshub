import { Resend } from "resend"

const FROM = process.env.EMAIL_FROM ?? "EbooksHub <support@flowlog.dev>"
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@flowlog.dev"

let client: Resend | null = null
function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured")
  client ??= new Resend(process.env.RESEND_API_KEY)
  return client
}

export interface SendEmailInput {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

/**
 * Fire-and-log email send — never throws. Notification emails (support
 * tickets, cancellations, account deletions) are a courtesy on top of the
 * actual state change (ticket row inserted, subscription canceled, account
 * deleted), which must succeed even if RESEND_API_KEY is missing or the
 * provider has an outage.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  try {
    const resend = getResend()
    const { error } = await resend.emails.send({
      from: FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    })
    if (error) console.error("Resend send failed:", error)
  } catch (err) {
    console.error("Email send failed:", err)
  }
}
