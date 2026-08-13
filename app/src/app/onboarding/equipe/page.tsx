"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { TAILLE_LABELS, type TailleEquipe } from "@/types/onboarding";
import { cn } from "@/lib/utils";

const TAILLES = Object.entries(TAILLE_LABELS) as [
  TailleEquipe,
  { label: string; description: string },
][];

export default function EquipePage() {
  const router = useRouter();
  const [taille, setTaille] = useState<TailleEquipe | null>(null);
  const [loading, setLoading] = useState(false);

  async function continuer() {
    if (!taille) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth");
      return;
    }

    // Mise à jour du restaurant avec la taille d'équipe
    await supabase.from("restaurants").update({ taille_equipe: taille }).eq("owner_id", user.id);

    await supabase.from("profiles").update({ onboarding_step: "membres" }).eq("id", user.id);

    router.push("/onboarding/membres");
  }

  return (
    <OnboardingShell step="equipe">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Quelle est la taille de votre équipe ?</h1>
          <p className="text-muted-foreground mt-1">
            Nombre de personnes que vous gérez au quotidien.
          </p>
        </div>

        <div className="space-y-3">
          {TAILLES.map(([key, { label, description }]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTaille(key)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border-2 px-5 py-4 transition-all",
                "hover:border-primary/50 hover:bg-primary/5",
                taille === key
                  ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                  : "border-border bg-background"
              )}
            >
              <div className="text-left">
                <p className="font-semibold">{label} personnes</p>
                <p className="text-muted-foreground text-sm">{description}</p>
              </div>
              <div
                className={cn(
                  "h-5 w-5 rounded-full border-2 transition-all",
                  taille === key ? "border-primary bg-primary" : "border-muted-foreground/30"
                )}
              />
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => router.back()}>
            Retour
          </Button>
          <Button className="flex-1" size="lg" disabled={!taille || loading} onClick={continuer}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continuer
          </Button>
        </div>
      </div>
    </OnboardingShell>
  );
}
