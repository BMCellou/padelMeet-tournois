import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { DesinscriptionForm } from "./DesinscriptionForm";

// Le lien figure dans un e-mail : jamais indexé, et la suppression exige un clic (pas de suppression par simple visite,
// qu'un antivirus ou un aperçu de messagerie pourrait déclencher).
export const metadata: Metadata = { title: "Désinscription — Globopadel", robots: { index: false, follow: false } };

export default async function DesinscriptionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="bg-primary p-3 text-primary-foreground">
        <div className="mx-auto w-fit">
          <BrandLogo />
        </div>
      </div>
      <div className="mx-auto w-full max-w-md p-4">
        <DesinscriptionForm token={token} />
      </div>
    </div>
  );
}
