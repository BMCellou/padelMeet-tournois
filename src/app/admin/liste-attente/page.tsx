import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "../AdminHeader";
import { AdminSidebar } from "../AdminSidebar";
import { MODELE_ANNONCE } from "@/lib/liste-attente/message";
import { DUREE_CONSERVATION_MOIS } from "@/lib/liste-attente/rgpd";
import { ListeAttentePanel, type Inscrit } from "./ListeAttentePanel";

export default async function ListeAttentePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("liste_attente")
    .select("id, prenom, nom, email, telephone, niveau, ville, created_at, notifie_at")
    .order("created_at", { ascending: false });

  const inscrits: Inscrit[] = (data ?? []).map((r) => ({
    id: r.id,
    prenom: r.prenom,
    nom: r.nom,
    email: r.email,
    telephone: r.telephone,
    niveau: r.niveau,
    ville: r.ville,
    inscritLe: r.created_at,
    notifieLe: r.notifie_at,
  }));

  const limite = new Date();
  limite.setMonth(limite.getMonth() - DUREE_CONSERVATION_MOIS);
  const nbAnciens = inscrits.filter((i) => new Date(i.inscritLe) < limite).length;

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminHeader />
      <div className="flex flex-col sm:flex-row">
        <AdminSidebar />
        <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-8">
          <div>
            <h1 className="text-2xl font-semibold">Liste d&apos;attente</h1>
            <p className="text-sm text-muted-foreground">
              Les personnes inscrites depuis la page{" "}
              <code className="rounded bg-muted px-1">/liste-attente</code> (lien à mettre en bio), à prévenir quand la
              date et le lieu du prochain tournoi sont connus.
            </p>
          </div>
          <ListeAttentePanel
            inscrits={inscrits}
            modele={MODELE_ANNONCE}
            nbAnciens={nbAnciens}
            dureeMois={DUREE_CONSERVATION_MOIS}
          />
        </div>
      </div>
    </div>
  );
}
