import { createBrowserClient } from "@supabase/ssr";

// TODO: parametrize with `Database` once `supabase gen types typescript --linked`
// has run against a real project (see supabase/migrations for the schema).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
