import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";

export async function AdminHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="w-full bg-primary text-primary-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <BrandLogo href="/admin" />
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <span className="text-sm text-primary-foreground/60">{user?.email}</span>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              Se déconnecter
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
