import { AdminHeader } from "../../AdminHeader";
import { AdminSidebar } from "../../AdminSidebar";
import { NouveauTournoiForm } from "./NouveauTournoiForm";

export default function NouveauTournoiPage() {
  return (
    <div className="min-h-screen bg-muted/20">
      <AdminHeader />
      <div className="flex flex-col sm:flex-row">
        <AdminSidebar />
        <div className="mx-auto w-full max-w-lg p-4 sm:p-8">
          <NouveauTournoiForm />
        </div>
      </div>
    </div>
  );
}
