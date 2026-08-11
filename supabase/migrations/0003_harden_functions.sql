-- Security hardening flagged by Supabase's advisor after 0001/0002 landed:
--   1. set_updated_at had a mutable search_path (hijack risk for a trigger
--      function that runs with the caller's privileges).
--   2. handle_new_user is SECURITY DEFINER and was callable directly via
--      /rest/v1/rpc/handle_new_user by anon/authenticated roles — it should
--      only ever run via the on_auth_user_created trigger.

alter function public.set_updated_at() set search_path = public, pg_temp;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
