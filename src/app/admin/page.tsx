import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { Button } from "@/components/ui/button";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tournois</h1>
          <p className="text-sm text-muted-foreground">
            Connecté en tant que {user?.email}
          </p>
        </div>
        <form action={signOut}>
          <Button variant="outline" type="submit">
            Se déconnecter
          </Button>
        </form>
      </div>
      <p className="text-sm text-muted-foreground">
        Aucun tournoi pour l&apos;instant.
      </p>
    </div>
  );
}
