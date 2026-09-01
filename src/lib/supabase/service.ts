import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Client service_role : contourne RLS. Réservé au code serveur (jamais
 * exposé au navigateur) pour deux usages précis :
 *  - `auth.admin.createUser` à l'inscription d'un participant (l'API
 *    publique `auth.signUp` est volontairement désactivée côté Supabase,
 *    voir 20260803120100_rls_policies.sql) ;
 *  - les lectures/écritures de l'espace participant (profil, historique,
 *    auto-inscription), toujours après vérification explicite de
 *    l'identité de l'appelant via `getParticipantConnecte()`
 *    (src/lib/participant/session.ts) — jamais sur la seule foi d'un
 *    identifiant transmis par le client.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
