// Hand-written to match supabase/migrations/0001_init.sql. If you have the
// Supabase CLI, prefer regenerating this from the live schema instead:
//   supabase gen types typescript --project-id <ref> > lib/supabase/types.ts

export type BookStatus = "draft" | "blueprint_ready" | "generating" | "complete" | "published" | "archived"
export type ChapterStatus = "waiting" | "planning" | "writing" | "illustrating" | "reviewing" | "complete" | "failed"
export type JobStatus = "queued" | "running" | "complete" | "failed" | "cancelled"
export type JobType = "BLUEPRINT" | "FULL_BOOK" | "CHAPTER" | "COVER" | "GLOSSARY" | "PROOFREAD"
export type CreditType = "text" | "image"
export type CoverVariant = "with_background" | "no_background"
export type CoverSource = "ai" | "canva" | "manual"
export type ImageSource = "ai" | "upload" | "mixed"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          author_name: string | null
          avatar_url: string | null
          bio: string | null
          website: string | null
          language: string
          country: string | null
          plan_id: string
          text_credits_remaining: number
          image_credits_remaining: number
          free_ebook_used_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          subscription_current_period_end: string | null
          account_canceled_at: string | null
          subscription_started_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string }
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>
        Relationships: []
      }
      plans: {
        Row: {
          id: string
          name: string
          price_cents: number
          billing_interval: string
          word_credits: number
          image_credits: number
          max_book_pages: number
          features: string[]
          is_active: boolean
          sort_order: number
        }
        Insert: Partial<Database["public"]["Tables"]["plans"]["Row"]> & { id: string; name: string }
        Update: Partial<Database["public"]["Tables"]["plans"]["Row"]>
        Relationships: []
      }
      books: {
        Row: {
          id: string
          owner_id: string
          title: string
          subtitle: string | null
          author_name: string | null
          book_type: string
          genre: string | null
          subgenre: string | null
          language: string
          target_audience: string | null
          target_age: string | null
          reading_level: string | null
          tone: string | null
          writing_style: string | null
          point_of_view: string | null
          page_count_target: number
          word_count_target: number | null
          illustration_frequency: string | null
          image_style: string | null
          dimensions: string | null
          status: BookStatus
          source_prompt: string | null
          selected_cover_id: string | null
          selected_back_cover_id: string | null
          is_free_tier: boolean
          reference_image_url: string | null
          requested_image_count: number
          image_source: ImageSource
          front_cover_copy: string | null
          back_cover_copy: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["books"]["Row"]> & { owner_id: string }
        Update: Partial<Database["public"]["Tables"]["books"]["Row"]>
        Relationships: []
      }
      book_blueprints: {
        Row: {
          id: string
          book_id: string
          concept: Record<string, unknown>
          front_matter: { section: string; label: string; pages: number }[]
          back_matter: { section: string; label: string; pages: number }[]
          total_pages_target: number
          total_pages_planned: number
          approved: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["book_blueprints"]["Row"]> & {
          book_id: string
          total_pages_target: number
          total_pages_planned: number
        }
        Update: Partial<Database["public"]["Tables"]["book_blueprints"]["Row"]>
        Relationships: []
      }
      chapters: {
        Row: {
          id: string
          book_id: string
          blueprint_id: string | null
          order_index: number
          chapter_number: number | null
          title: string
          subtitle: string | null
          summary: string | null
          target_pages: number
          target_words: number | null
          status: ChapterStatus
          word_count: number
          content: string | null
          content_html: string | null
          error: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["chapters"]["Row"]> & {
          book_id: string
          order_index: number
          title: string
        }
        Update: Partial<Database["public"]["Tables"]["chapters"]["Row"]>
        Relationships: []
      }
      chapter_versions: {
        Row: {
          id: string
          chapter_id: string
          content: string
          word_count: number
          label: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["chapter_versions"]["Row"]> & {
          chapter_id: string
          content: string
        }
        Update: Partial<Database["public"]["Tables"]["chapter_versions"]["Row"]>
        Relationships: []
      }
      characters: {
        Row: {
          id: string
          book_id: string
          name: string
          age: string | null
          gender: string | null
          role: string | null
          personality: string | null
          appearance: Record<string, string>
          relationships: string | null
          notes: string | null
          reference_image_url: string | null
          image_style: string | null
          consistency_lock: boolean
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["characters"]["Row"]> & { book_id: string; name: string }
        Update: Partial<Database["public"]["Tables"]["characters"]["Row"]>
        Relationships: []
      }
      book_bible_facts: {
        Row: {
          id: string
          book_id: string
          fact_type: string
          subject: string
          description: string
          source_chapter_id: string | null
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["book_bible_facts"]["Row"]> & {
          book_id: string
          fact_type: string
          subject: string
          description: string
        }
        Update: Partial<Database["public"]["Tables"]["book_bible_facts"]["Row"]>
        Relationships: []
      }
      generation_jobs: {
        Row: {
          id: string
          book_id: string
          job_type: JobType
          status: JobStatus
          progress_percent: number
          error: string | null
          created_at: string
          started_at: string | null
          completed_at: string | null
        }
        Insert: Partial<Database["public"]["Tables"]["generation_jobs"]["Row"]> & {
          book_id: string
          job_type: JobType
        }
        Update: Partial<Database["public"]["Tables"]["generation_jobs"]["Row"]>
        Relationships: []
      }
      generation_tasks: {
        Row: {
          id: string
          job_id: string
          book_id: string
          chapter_id: string | null
          task_type: string
          status: ChapterStatus
          order_index: number
          attempts: number
          error: string | null
          output: Record<string, unknown> | null
          claimed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["generation_tasks"]["Row"]> & {
          job_id: string
          book_id: string
          task_type: string
        }
        Update: Partial<Database["public"]["Tables"]["generation_tasks"]["Row"]>
        Relationships: []
      }
      covers: {
        Row: {
          id: string
          book_id: string
          image_url: string
          prompt: string | null
          style: string | null
          provider: string | null
          is_selected: boolean
          variant: CoverVariant
          source: CoverSource
          overlay_text: { text: string; x: number; y: number; fontSize: number; color: string; fontFamily: string }[] | null
          is_back_cover: boolean
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["covers"]["Row"]> & { book_id: string; image_url: string }
        Update: Partial<Database["public"]["Tables"]["covers"]["Row"]>
        Relationships: []
      }
      images: {
        Row: {
          id: string
          book_id: string
          chapter_id: string | null
          url: string
          prompt: string | null
          negative_prompt: string | null
          style: string | null
          aspect_ratio: string | null
          provider: string | null
          status: string
          source: "ai" | "upload"
          slot_index: number | null
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["images"]["Row"]> & { book_id: string; url: string }
        Update: Partial<Database["public"]["Tables"]["images"]["Row"]>
        Relationships: []
      }
      glossary_terms: {
        Row: {
          id: string
          book_id: string
          term: string
          definition: string
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["glossary_terms"]["Row"]> & {
          book_id: string
          term: string
          definition: string
        }
        Update: Partial<Database["public"]["Tables"]["glossary_terms"]["Row"]>
        Relationships: []
      }
      usage_ledger: {
        Row: {
          id: string
          user_id: string
          book_id: string | null
          credit_type: CreditType
          amount: number
          reason: string
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["usage_ledger"]["Row"]> & {
          user_id: string
          credit_type: CreditType
          amount: number
          reason: string
        }
        Update: Partial<Database["public"]["Tables"]["usage_ledger"]["Row"]>
        Relationships: []
      }
      canva_connections: {
        Row: {
          user_id: string
          access_token_encrypted: string
          refresh_token_encrypted: string
          scope: string
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["canva_connections"]["Row"]> & {
          user_id: string
          access_token_encrypted: string
          refresh_token_encrypted: string
          scope: string
          expires_at: string
        }
        Update: Partial<Database["public"]["Tables"]["canva_connections"]["Row"]>
        Relationships: []
      }
      stripe_webhook_events: {
        Row: { stripe_event_id: string; event_type: string; processed_at: string }
        Insert: { stripe_event_id: string; event_type: string; processed_at?: string }
        Update: Partial<Database["public"]["Tables"]["stripe_webhook_events"]["Row"]>
        Relationships: []
      }
      support_tickets: {
        Row: {
          id: string
          ticket_number: string
          user_id: string | null
          name: string
          email: string
          subject: string
          message: string
          status: string
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["support_tickets"]["Row"]> & {
          ticket_number: string
          name: string
          email: string
          subject: string
          message: string
        }
        Update: Partial<Database["public"]["Tables"]["support_tickets"]["Row"]>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      next_ticket_number: { Args: Record<string, never>; Returns: string }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
