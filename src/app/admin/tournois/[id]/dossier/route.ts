import { createClient } from "@/lib/supabase/server";
import { estAdmin } from "@/lib/staff/session";
import { chargerDonneesTournoi, nomFichierPdf } from "@/lib/pdf/charger";
import { genererDossierOrganisation } from "@/lib/pdf/dossier";

export const dynamic = "force-dynamic";

/** Dossier d'organisation (PDF), généré à la demande côté serveur. Admin uniquement. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await estAdmin())) return new Response("Non autorisé.", { status: 403 });

  const { id } = await params;
  const donnees = await chargerDonneesTournoi(await createClient(), id);
  if (!donnees) return new Response("Tournoi introuvable.", { status: 404 });

  const { bytes } = await genererDossierOrganisation(donnees, new Date());
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomFichierPdf("dossier-organisation", donnees.tournoi.nom)}"`,
      "Cache-Control": "no-store",
    },
  });
}
