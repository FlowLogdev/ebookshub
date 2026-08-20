import { sendEmail, SUPPORT_EMAIL } from "@/lib/email"
import { createServiceRoleClient } from "@/lib/supabase/server"

export interface CreateTicketInput {
  userId: string | null
  name: string
  email: string
  subject: string
  message: string
}

/**
 * Creates a support ticket (via the service role client, since
 * unauthenticated visitors on /support can open tickets and RLS has no
 * insert policy for anon/authenticated), then emails support with the full
 * ticket and a confirmation copy to whoever opened it.
 */
export async function createSupportTicket(input: CreateTicketInput): Promise<{ ticketNumber: string }> {
  const supabase = createServiceRoleClient()

  const { data: ticketNumber, error: rpcError } = await supabase.rpc("next_ticket_number")
  if (rpcError || !ticketNumber) throw new Error(rpcError?.message ?? "Failed to generate a ticket number.")

  const { error: insertError } = await supabase.from("support_tickets").insert({
    ticket_number: ticketNumber,
    user_id: input.userId,
    name: input.name,
    email: input.email,
    subject: input.subject,
    message: input.message,
  })
  if (insertError) throw new Error(insertError.message)

  await Promise.all([
    sendEmail({
      to: SUPPORT_EMAIL,
      subject: `[${ticketNumber}] ${input.subject}`,
      replyTo: input.email,
      html: `
        <p><strong>Ticket:</strong> ${ticketNumber}</p>
        <p><strong>From:</strong> ${input.name} (${input.email})</p>
        <p><strong>Subject:</strong> ${input.subject}</p>
        <p><strong>Message:</strong></p>
        <p>${input.message.replace(/\n/g, "<br>")}</p>
      `,
    }),
    sendEmail({
      to: input.email,
      subject: `We received your request — ${ticketNumber}`,
      html: `
        <p>Hi ${input.name},</p>
        <p>Thanks for reaching out. Your ticket number is <strong>${ticketNumber}</strong> — keep it for reference.</p>
        <p><strong>Your message:</strong></p>
        <p>${input.message.replace(/\n/g, "<br>")}</p>
        <p>We'll get back to you at this email address as soon as possible.</p>
      `,
    }),
  ])

  return { ticketNumber }
}
