import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { DesinscriptionForm } from "./DesinscriptionForm";
import { SiteFooter } from "@/components/SiteFooter";

// Le lien figure dans un e-mail : jamais indexé, et la suppression exige un clic (pas de suppression par simple visite,
// qu'un antivirus ou un aperçu de messagerie pourrait déclencher).
export const metadata: Metadata = { title: "Désinscription — GloboPadel", robots: { index: false, follow: false } };

export default async function DesinscriptionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="bg-primary p-3 text-primary-foreground">
        <div className="mx-auto w-fit">
          <BrandLogo />
        </div>
      </div>
      <div className="mx-auto w-full max-w-md p-4">
        <DesinscriptionForm token={token} />
      </div>
      <SiteFooter />
    </div>
  );
}
