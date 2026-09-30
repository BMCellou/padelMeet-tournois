import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "../AdminHeader";
import { AdminSidebar } from "../AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listerBackups } from "@/lib/backup/service";
import { BackupPanel } from "./BackupPanel";

export default async function SauvegardesPage() {
  const supabase = await createClient();
  const backups = await listerBackups(supabase);

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminHeader />
      <div className="flex flex-col sm:flex-row">
        <AdminSidebar />
        <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-8">
          <h1 className="text-2xl font-semibold">Sauvegardes</h1>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export complet de la base</CardTitle>
            </CardHeader>
            <CardContent>
              <BackupPanel backups={backups} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
