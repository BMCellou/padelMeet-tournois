import { createClient } from "@/lib/supabase/server";
import { estAdmin } from "@/lib/staff/session";
import { chargerDonneesTournoi, nomFichierPdf } from "@/lib/pdf/charger";
import { genererResultats } from "@/lib/pdf/resultats";

export const dynamic = "force-dynamic";

/** Résultats (PDF), disponibles une fois le tournoi terminé. Admin uniquement. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await estAdmin())) return new Response("Non autorisé.", { status: 403 });

  const { id } = await params;
  const donnees = await chargerDonneesTournoi(await createClient(), id);
  if (!donnees) return new Response("Tournoi introuvable.", { status: 404 });
  if (donnees.tournoi.statut !== "termine") {
    return new Response("Les résultats ne sont disponibles qu'une fois le tournoi terminé.", { status: 409 });
  }

  const { bytes } = await genererResultats(donnees);
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomFichierPdf("resultats", donnees.tournoi.nom)}"`,
      "Cache-Control": "no-store",
    },
  });
}
