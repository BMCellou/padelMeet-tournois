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
        <Link href="/admin" className="text-lg font-semibold">
          PadelMeet Tournois
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
