"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRolesStaff } from "@/lib/staff/session";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z
  .object({
    password: z.string().min(8, "8 caractères minimum."),
    confirmation: z.string(),
  })
  .refine((d) => d.password === d.confirmation, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmation"],
  });

type ActionResult = { error: string } | { success: true };

export async function definirMotDePasse(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = schema.safeParse({
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { error: "Impossible de définir ce mot de passe." };
  }

  // Le mot de passe provisoire vient d'être remplacé : on lève le flag qui
  // forçait ce passage (voir proxy.ts), sinon la personne y reboucle sans
  // fin. `updateUser` ne touche qu'au mot de passe, jamais au
  // `user_metadata` — il faut le service role pour ça.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const service = createServiceClient();
    await service.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, must_change_password: false },
    });
  }

  const roles = await getRolesStaff();
  const admin = roles.find((r) => r.role === "admin");
  const scoreur = roles.find((r) => r.role === "scorekeeper");

  redirect(admin ? "/admin" : scoreur ? `/admin/tournois/${scoreur.tournamentId}/scores` : "/compte");
}
