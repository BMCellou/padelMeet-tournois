import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "../../AdminHeader";
import { AdminSidebar } from "../../AdminSidebar";
import { NouveauTournoiForm } from "./NouveauTournoiForm";
import { ClubForm } from "../../club/ClubForm";

export default async function NouveauTournoiPage() {
  const supabase = await createClient();
  const { data: clubs } = await supabase.from("clubs").select("id, nom").order("nom");

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminHeader />
      <div className="flex flex-col sm:flex-row">
        <AdminSidebar />
        <div className="mx-auto w-full max-w-lg p-4 sm:p-8">
          {!clubs || clubs.length === 0 ? (
            <ClubForm />
          ) : (
            <NouveauTournoiForm clubs={clubs} />
          )}
        </div>
      </div>
    </div>
  );
}
