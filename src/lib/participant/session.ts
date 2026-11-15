import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface ParticipantConnecte {
  userId: string;
  /** Adresse du compte (e-mail de connexion). */
  email: string | null;
  playerId: string;
  nom: string;
  prenom: string;
  /** null pour un profil créé avant que le numéro soit obligatoire. */
  telephone: string | null;
}

/**
 * Identifie le participant actuellement connecté à partir de sa session
 * (cookies), puis charge son profil joueur via le client service_role.
 * Ne fait jamais confiance à un identifiant transmis par le client : c'est
 * toujours `auth.getUser()` (lié aux cookies de la requête) qui fait foi.
 */
export async function getParticipantConnecte(): Promise<ParticipantConnecte | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: joueur } = await service
    .from("players")
    .select("id, nom, prenom, telephone")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!joueur) return null;

  return { userId: user.id, email: user.email ?? null, playerId: joueur.id, nom: joueur.nom, prenom: joueur.prenom, telephone: joueur.telephone };
}
