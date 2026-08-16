"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { SECTEUR_LABELS, type Secteur } from "@/types/onboarding";
import { cn } from "@/lib/utils";

const SECTEURS = Object.entries(SECTEUR_LABELS) as [Secteur, { label: string; emoji: string }][];

export default function SecteurPage() {
  const router = useRouter();
  const [secteur, setSecteur] = useState<Secteur | null>(null);
  const [loading, setLoading] = useState(false);

  async function continuer() {
    if (!secteur) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("restaurants")
        .upsert({ owner_id: user.id, secteur }, { onConflict: "owner_id" });
      await supabase.from("profiles").update({ onboarding_step: "equipe" }).eq("id", user.id);
    }

    router.push("/onboarding/equipe");
  }

  return (
    <OnboardingShell step="secteur">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Quel est votre secteur d&apos;activité ?</h1>
          <p className="text-muted-foreground mt-1">
            Choisissez le type d&apos;établissement que vous gérez.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SECTEURS.map(([key, { label, emoji }]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSecteur(key)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all",
                "hover:border-primary/50 hover:bg-primary/5",
                secteur === key
                  ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                  : "border-border bg-background"
              )}
            >
              <span className="text-3xl">{emoji}</span>
              <span className="text-sm leading-tight font-medium">{label}</span>
            </button>
          ))}
        </div>

        <Button className="w-full" size="lg" disabled={!secteur || loading} onClick={continuer}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Continuer
        </Button>
      </div>
    </OnboardingShell>
  );
}
