// Inscription à la liste d'attente : e-mail, téléphone et niveau obligatoires, ville facultative.
// Pur : partagé par l'action serveur et les tests.

import { z } from "zod";
import { schemaTelephone } from "@/lib/inscriptions/telephone";
import { CODES_NIVEAU } from "./niveaux";
import { VERSION_RGPD } from "./rgpd";

export { VERSION_RGPD };

export const inscriptionListeAttenteSchema = z.object({
  prenom: z.string().trim().min(1, "Le prénom est requis.").max(60, "Le prénom est trop long."),
  nom: z.string().trim().min(1, "Le nom est requis.").max(60, "Le nom est trop long."),
  email: z.string().trim().toLowerCase().min(1, "L'e-mail est requis.").email("E-mail invalide.").max(160, "L'e-mail est trop long."),
  telephone: schemaTelephone(),
  niveau: z.enum(CODES_NIVEAU, { error: "Choisis ton niveau." }),
  // Facultative : on ne ferme pas la porte à quelqu'un d'une autre ville.
  ville: z
    .string()
    .trim()
    .max(80, "La ville est trop longue.")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null),
  consentement: z.literal("on", { error: "Coche la case pour accepter d'être contacté(e) et t'inscrire." }),
});

export type InscriptionListeAttente = z.infer<typeof inscriptionListeAttenteSchema>;
