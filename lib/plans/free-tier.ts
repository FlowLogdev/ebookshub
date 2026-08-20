import type { SupabaseClient } from "@supabase/supabase-js"

import { FREE_TIER_MAX_IMAGES, FREE_TIER_MAX_PAGES, FREE_TIER_MAX_WORDS } from "@/lib/book/constants"
import type { Database } from "@/lib/supabase/types"

type TypedClient = SupabaseClient<Database>
type Profile = Database["public"]["Tables"]["profiles"]["Row"]

/** Dedicated pricing page — the upgrade destination used by every plan gate. */
export const UPGRADE_URL = "/pricing"

export const FREE_TIER_LIMITS = {
  maxPages: FREE_TIER_MAX_PAGES,
  maxWords: FREE_TIER_MAX_WORDS,
  maxImages: FREE_TIER_MAX_IMAGES,
} as const

export function isFreePlan(profile: Pick<Profile, "plan_id">): boolean {
  return profile.plan_id === "free"
}

export function isProPlan(profile: Pick<Profile, "plan_id">): boolean {
  return profile.plan_id === "pro"
}

export function hasUsedFreeEbook(profile: Pick<Profile, "free_ebook_used_at">): boolean {
  return profile.free_ebook_used_at !== null
}

/**
 * Atomically claims the account's one-time free ebook slot. Returns false
 * (without writing anything) if the plan isn't free or the slot is already
 * used — callers must treat `false` as "reject the request", not retry.
 * The `.is(...)` guard makes this safe against two concurrent requests both
 * trying to claim the same slot.
 */
export async function claimFreeTierSlot(supabase: TypedClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ free_ebook_used_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("plan_id", "free")
    .is("free_ebook_used_at", null)
    .select("id")
    .maybeSingle()

  if (error) throw new Error(`Failed to claim free-tier slot: ${error.message}`)
  return data !== null
}

export interface UpgradeRequiredPayload {
  error: string
  upgradeRequired: true
  upgradeUrl: string
}

export function upgradeRequired(message: string): UpgradeRequiredPayload {
  return { error: message, upgradeRequired: true, upgradeUrl: UPGRADE_URL }
}
