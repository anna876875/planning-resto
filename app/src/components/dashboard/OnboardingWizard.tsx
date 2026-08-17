"use client";

import { useState } from "react";
import { Plus, Trash2, UserCheck, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SECTEUR_LABELS, TAILLE_LABELS, STATUT_LABELS, JOURS_SEMAINE } from "@/types/onboarding";
import type { Secteur, TailleEquipe, StatutContractuel, JourSemaine } from "@/types/onboarding";
import { cn } from "@/lib/utils";

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface MembreLocal {
  id: string;
  prenom: string;
  nom: string;
  role: string;
  statut: StatutContractuel | "";
  heures: number;
  indispos: JourSemaine[];
}

const SECTEURS = Object.entries(SECTEUR_LABELS) as [Secteur, { label: string; emoji: string }][];
const TAILLES = Object.entries(TAILLE_LABELS) as [
  TailleEquipe,
  { label: string; description: string },
][];
const STATUTS = Object.entries(STATUT_LABELS) as [StatutContractuel, string][];

const STEPS = [
  { key: "secteur", label: "Secteur" },
  { key: "equipe", label: "Équipe" },
  { key: "membres", label: "Membres" },
] as const;

type Step = (typeof STEPS)[number]["key"];

// ─── Composant ────────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  onComplete: (data: { secteur: Secteur; taille: TailleEquipe; membres: MembreLocal[] }) => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>("secteur");
  const [secteur, setSecteur] = useState<Secteur | null>(null);
  const [taille, setTaille] = useState<TailleEquipe | null>(null);
  const [membres, setMembres] = useState<MembreLocal[]>([]);
  const [saving, setSaving] = useState(false);

  // Form état nouveau membre
  const [form, setForm] = useState<Omit<MembreLocal, "id" | "indispos">>({
    prenom: "",
    nom: "",
    role: "",
    statut: "",
    heures: 35,
  });
  const [indispos, setIndispos] = useState<JourSemaine[]>([]);
  const [formError, setFormError] = useState("");

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  function ajouterMembre() {
    if (!form.prenom || !form.nom || !form.role) {
      setFormError("Prénom, nom et poste sont requis.");
      return;
    }
    setFormError("");
    setMembres((prev) => [...prev, { id: crypto.randomUUID(), ...form, indispos }]);
    setForm({ prenom: "", nom: "", role: "", statut: "", heures: 35 });
    setIndispos([]);
  }

  function toggleIndispo(j: JourSemaine) {
    setIndispos((prev) => (prev.includes(j) ? prev.filter((d) => d !== j) : [...prev, j]));
  }

  async function terminer() {
    if (!secteur || !taille) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600)); // UX feedback
    onComplete({ secteur, taille, membres });
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="border-border bg-background sticky top-0 z-10 flex h-14 items-center border-b px-6">
        <div>
          <h1 className="text-base font-semibold">Bienvenue sur Planning Resto</h1>
          <p className="text-muted-foreground text-xs">
            Configurez votre restaurant en quelques étapes
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-8 p-6">
        {/* Barre de progression */}
        <div className="space-y-3">
          <div className="flex justify-between">
            {STEPS.map((s, i) => (
              <span
                key={s.key}
                className={cn(
                  "text-xs font-medium",
                  i <= stepIndex ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            ))}
          </div>
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-muted-foreground text-right text-xs">
            Étape {stepIndex + 1} sur {STEPS.length}
          </p>
        </div>

        {/* ── Étape 1 : Secteur ─────────────────────────────────────────────── */}
        {step === "secteur" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Quel est votre secteur d&apos;activité ?</h2>
              <p className="text-muted-foreground mt-1 text-sm">
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
            <Button
              className="w-full"
              size="lg"
              disabled={!secteur}
              onClick={() => setStep("equipe")}
            >
              Continuer
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ── Étape 2 : Taille équipe ───────────────────────────────────────── */}
        {step === "equipe" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Quelle est la taille de votre équipe ?</h2>
              <p className="text-muted-foreground mt-1 text-sm">
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
              <Button variant="outline" className="flex-1" onClick={() => setStep("secteur")}>
                Retour
              </Button>
              <Button
                className="flex-1"
                size="lg"
                disabled={!taille}
                onClick={() => setStep("membres")}
              >
                Continuer
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Étape 3 : Membres ────────────────────────────────────────────── */}
        {step === "membres" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Ajoutez votre équipe</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Vous pourrez toujours en ajouter d&apos;autres plus tard.
              </p>
            </div>

            {/* Membres déjà ajoutés */}
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
                          <p className="text-sm font-medium">
                            {m.prenom} {m.nom}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">{m.role}</span>
                            {m.statut && (
                              <Badge variant="outline" className="text-xs">
                                {STATUT_LABELS[m.statut]}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMembres((prev) => prev.filter((x) => x.id !== m.id))}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Formulaire */}
            <Card>
              <CardContent className="space-y-4 pt-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Prénom</Label>
                    <Input
                      placeholder="Marie"
                      value={form.prenom}
                      onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nom</Label>
                    <Input
                      placeholder="Dupont"
                      value={form.nom}
                      onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Poste</Label>
                  <Input
                    placeholder="Ex : Chef de partie, Serveur…"
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Statut contractuel</Label>
                    <select
                      className="border-input bg-background flex h-9 w-full rounded-lg border px-3 text-sm"
                      value={form.statut}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, statut: e.target.value as StatutContractuel | "" }))
                      }
                    >
                      <option value="">— Choisir —</option>
                      {STATUTS.map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Heures / semaine</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={form.heures}
                      onChange={(e) => setForm((f) => ({ ...f, heures: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Indisponibilités récurrentes (optionnel)</Label>
                  <div className="flex gap-2">
                    {JOURS_SEMAINE.map((jour, i) => (
                      <button
                        key={jour}
                        type="button"
                        onClick={() => toggleIndispo(i as JourSemaine)}
                        className={cn(
                          "h-9 w-10 rounded-lg border text-sm font-medium transition-all",
                          indispos.includes(i as JourSemaine)
                            ? "border-destructive bg-destructive/10 text-destructive"
                            : "border-border hover:border-muted-foreground"
                        )}
                      >
                        {jour}
                      </button>
                    ))}
                  </div>
                </div>
                {formError && <p className="text-destructive text-xs">{formError}</p>}
                <Button type="button" variant="outline" className="w-full" onClick={ajouterMembre}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter ce membre
                </Button>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("equipe")}>
                Retour
              </Button>
              <Button className="flex-1" size="lg" disabled={saving} onClick={terminer}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Accéder au tableau de bord
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
