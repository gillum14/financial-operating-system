-- Hardened profile-creation trigger: creates the matching public.users row
-- whenever a new auth.users row is inserted (real signup, via Supabase
-- Auth — never a path application code calls directly).
--
-- Security notes:
-- * SECURITY DEFINER is required: the role that inserts into auth.users
--   (Supabase's internal auth admin role) does not have insert privileges
--   on public.users, so the function must run as its (privileged) owner.
-- * search_path is pinned to '' (empty) with every reference fully
--   qualified, closing the classic SECURITY DEFINER search_path-hijack
--   hole (CVE-2018-1058-style attacks). Only pg_catalog builtins
--   (lower/trim/coalesce/nullif/split_part) are used, which resolve
--   regardless of search_path.
-- * Inserts only the three columns Athena actually owns (id, email,
--   display_name) — no broader metadata is copied.
-- * raw_user_meta_data is client-supplied at signup and is therefore
--   untrusted; it is used only for a non-security-sensitive display name,
--   never for any authorization or role decision.
-- * ON CONFLICT (id) DO NOTHING makes the insert idempotent if the trigger
--   is ever re-fired for an id that already has a profile.
-- * No dynamic SQL, no broad grants. EXECUTE is explicitly revoked from
--   PUBLIC/anon/authenticated below so the function cannot be invoked
--   through PostgREST's public RPC surface (any function left executable
--   in the public schema is callable via POST /rest/v1/rpc/<name> by
--   default) — trigger firing does not require that grant.
-- * A failure here raises a normal Postgres error, which rolls back the
--   whole auth.users insert transactionally — signup fails cleanly rather
--   than leaving an auth user with no matching profile. No secrets appear
--   in any value this function touches.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    lower(trim(coalesce(new.email, ''))),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(split_part(lower(trim(coalesce(new.email, ''))), '@', 1), ''),
      'New User'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
--> statement-breakpoint

revoke all on function public.handle_new_user() from public, anon, authenticated;
--> statement-breakpoint

drop trigger if exists on_auth_user_created on auth.users;
--> statement-breakpoint

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
