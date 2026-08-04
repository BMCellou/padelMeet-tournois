import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export async function AdminHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="w-full border-b bg-background">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <Link href="/admin" className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            P
          </span>
          <span>
            PadelMeet <span className="text-primary">Tournois</span>
          </span>
        </Link>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <form action={signOut}>
            <Button variant="outline" size="sm" type="submit">
              Se déconnecter
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
