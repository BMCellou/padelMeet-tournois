import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// TODO: parametrize with `Database` once `supabase gen types typescript --linked`
// has run against a real project (see supabase/migrations for the schema).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll called from a Server Component: ignore, middleware refreshes the session.
          }
        },
      },
    },
  );
}
