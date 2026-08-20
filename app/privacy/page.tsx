import { SiteFooter } from "@/components/marketing/site-footer"
import { SiteHeader } from "@/components/marketing/site-header"

export const metadata = {
  title: "Privacy Policy | EbooksHub",
  description: "How EbooksHub collects, uses, and protects your data.",
}

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-paper py-16 sm:py-24">
        <article className="container prose prose-neutral max-w-3xl dark:prose-invert">
          <p className="text-sm font-medium text-gold">Legal</p>
          <h1 className="font-display">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

          <h2>What we collect</h2>
          <p>
            When you create an account, we collect your email address and any profile details you choose to add
            (display name, author name, bio, website). When you create a book, we store the content you write or
            generate — prompts, chapters, covers, and illustrations — so your work is saved and editable.
          </p>

          <h2>How we use it</h2>
          <ul>
            <li>To generate, store, and let you edit your books.</li>
            <li>To process payments and manage your subscription through Stripe.</li>
            <li>To respond to support requests you send us.</li>
            <li>To send you account-related emails: confirmations, billing receipts, and support replies.</li>
          </ul>

          <h2>AI providers</h2>
          <p>
            Generating book text and artwork involves sending your prompts and drafts to third-party AI providers
            (including Anthropic, OpenAI, DeepSeek, Google Gemini, and Higgsfield, depending on the content type).
            Each provider processes that data under its own privacy terms to return a result to EbooksHub.
          </p>

          <h2>Payments</h2>
          <p>
            Subscription payments are processed by Stripe. EbooksHub does not store your card number — Stripe
            handles that directly and shares back only what we need to manage your subscription (plan, status,
            renewal date).
          </p>

          <h2>Data retention and deletion</h2>
          <p>
            Your books and account data are kept for as long as your account exists. You can permanently delete
            your account and all associated data at any time from Settings. Deletion is immediate and cannot be
            undone.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about this policy or your data can be sent through our <a href="/support">support page</a>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  )
}
