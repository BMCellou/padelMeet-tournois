"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LienPublic({ url }: { url: string }) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // Presse-papiers indisponible (contexte non sécurisé, permissions) :
      // le champ reste sélectionnable manuellement.
    }
  }

  return (
    <div className="flex gap-2">
      <Input readOnly value={url} className="text-sm" onFocus={(e) => e.target.select()} />
      <Button type="button" variant="outline" onClick={copier} className="shrink-0">
        {copie ? "Copié !" : "Copier"}
      </Button>
    </div>
  );
}
