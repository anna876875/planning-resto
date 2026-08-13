"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Loader2, UserCheck } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";
import {
  STATUT_LABELS,
  JOURS_SEMAINE,
  type MembreEquipe,
  type StatutContractuel,
  type JourSemaine,
} from "@/types/onboarding";
import { cn } from "@/lib/utils";

// ─── Validation ──────────────────────────────────────────────────────────────

const STATUT_VALUES = [
  "extra",
  "etudiant",
  "cdi_temps_plein",
  "cdi_mi_temps",
  "cdd",
  "apprenti_alternant",
  "saisonnier",
  "interimaire",
] as const satisfies readonly StatutContractuel[];

const membreSchema = z.object({
  prenom: z.string().min(1, "Prénom requis"),
  nom: z.string().min(1, "Nom requis"),
  role: z.string().min(1, "Poste requis"),
  statutContractuel: z.enum(STATUT_VALUES, { error: () => "Statut requis" }),
  heuresParSemaine: z.number().min(1, "Min 1h").max(60, "Max 60h"),
});

type MembreForm = z.infer<typeof membreSchema>;

const STATUTS = Object.entries(STATUT_LABELS) as [StatutContractuel, string][];

// ─── Composant ───────────────────────────────────────────────────────────────

export default function MembresPage() {
  const router = useRouter();
  const [membres, setMembres] = useState<MembreEquipe[]>([]);
  const [joursSelectionnes, setJoursSelectionnes] = useState<JourSemaine[]>([]);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MembreForm>({
    resolver: zodResolver(membreSchema),
    defaultValues: { heuresParSemaine: 35 },
  });

  function ajouterMembre(data: MembreForm) {
    const indisponibilites = joursSelectionnes.map((j) => ({
      type: "recurrent" as const,
      jourSemaine: j,
    }));
    setMembres((prev) => [...prev, { id: crypto.randomUUID(), ...data, indisponibilites }]);
    reset({ heuresParSemaine: 35 });
    setJoursSelectionnes([]);
    setShowForm(false);
  }

  function supprimerMembre(id: string) {
    setMembres((prev) => prev.filter((m) => m.id !== id));
  }

  function toggleJour(jour: JourSemaine) {
    setJoursSelectionnes((prev) =>
      prev.includes(jour) ? prev.filter((j) => j !== jour) : [...prev, jour]
    );
  }

  async function terminer() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth");
      return;
    }

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (restaurant && membres.length > 0) {
      for (const m of membres) {
        const { data: tm } = await supabase
          .from("team_members")
          .insert({
            restaurant_id: restaurant.id,
            prenom: m.prenom,
            nom: m.nom,
            role: m.role,
            statut_contractuel: m.statutContractuel,
            heures_par_semaine: m.heuresParSemaine,
          })
          .select("id")
          .single();

        if (tm && m.indisponibilites.length > 0) {
          await supabase.from("unavailabilities").insert(
            m.indisponibilites.map((ind) => ({
              team_member_id: tm.id,
              type: ind.type,
              jour_semaine: ind.jourSemaine ?? null,
            }))
          );
        }
      }
    }

    await supabase.from("profiles").update({ onboarding_step: "done" }).eq("id", user.id);

    router.push("/onboarding/confirmation");
  }

  return (
    <OnboardingShell step="membres">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Ajoutez votre équipe</h1>
          <p className="text-muted-foreground mt-1">
            Vous pourrez toujours en ajouter d&apos;autres plus tard.
          </p>
        </div>

        {/* Liste des membres déjà ajoutés */}
        {membres.length > 0 && (
          <div className="space-y-2">
            {membres.map((m) => (
              <Card key={m.id} className="py-0">
                <CardContent className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-full">
                      <UserCheck className="text-primary h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {m.prenom} {m.nom}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">{m.role}</span>
                        <Badge variant="outline" className="text-xs">
                          {STATUT_LABELS[m.statutContractuel]}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {m.heuresParSemaine}h/sem
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => supprimerMembre(m.id!)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Supprimer ce membre"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Formulaire d'ajout */}
        {showForm ? (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input id="prenom" placeholder="Marie" {...register("prenom")} />
                  {errors.prenom && (
                    <p className="text-destructive text-xs">{errors.prenom.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nom">Nom</Label>
                  <Input id="nom" placeholder="Dupont" {...register("nom")} />
                  {errors.nom && <p className="text-destructive text-xs">{errors.nom.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role">Poste / Fonction</Label>
                <Input
                  id="role"
                  placeholder="Ex : Chef de partie, Serveur…"
                  {...register("role")}
                />
                {errors.role && <p className="text-destructive text-xs">{errors.role.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="statut">Statut contractuel</Label>
                <select
                  id="statut"
                  className="border-input bg-background text-foreground flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                  {...register("statutContractuel")}
                >
                  <option value="">Sélectionnez un statut</option>
                  {STATUTS.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.statutContractuel && (
                  <p className="text-destructive text-xs">{errors.statutContractuel.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="heures">Heures par semaine</Label>
                <Input
                  id="heures"
                  type="number"
                  min={1}
                  max={60}
                  {...register("heuresParSemaine", { valueAsNumber: true })}
                />
                {errors.heuresParSemaine && (
                  <p className="text-destructive text-xs">{errors.heuresParSemaine.message}</p>
                )}
              </div>

              {/* Indisponibilités récurrentes */}
              <div className="space-y-2">
                <Label>Jours d&apos;indisponibilité récurrents (optionnel)</Label>
                <div className="flex flex-wrap gap-2">
                  {JOURS_SEMAINE.map((jour, i) => (
                    <button
                      key={jour}
                      type="button"
                      onClick={() => toggleJour(i as JourSemaine)}
                      className={cn(
                        "h-9 w-10 rounded-lg border text-sm font-medium transition-all",
                        joursSelectionnes.includes(i as JourSemaine)
                          ? "border-destructive bg-destructive/10 text-destructive"
                          : "border-border hover:border-muted-foreground"
                      )}
                    >
                      {jour}
                    </button>
                  ))}
                </div>
                {joursSelectionnes.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    Indisponible le(s) : {joursSelectionnes.map((j) => JOURS_SEMAINE[j]).join(", ")}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                {membres.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowForm(false)}
                  >
                    Annuler
                  </Button>
                )}
                <Button type="button" className="flex-1" onClick={handleSubmit(ajouterMembre)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter ce membre
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un autre membre
          </Button>
        )}

        {/* Actions finales */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => router.back()}>
            Retour
          </Button>
          <Button className="flex-1" size="lg" disabled={saving} onClick={terminer}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Terminer l&apos;onboarding
          </Button>
        </div>
      </div>
    </OnboardingShell>
  );
}
