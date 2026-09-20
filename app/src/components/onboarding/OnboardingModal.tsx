"use client";

import { useState } from "react";
import { ArrowLeft, Check, Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveConfig, DEFAULT_CONFIG } from "@/lib/planning/config";
import type { PlanningConfig } from "@/lib/planning/config";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepId = "horaires" | "equipe" | "effectif" | "postes" | "repos" | "weekends" | "recap";

const STEPS: StepId[] = ["horaires", "equipe", "effectif", "postes", "repos", "weekends", "recap"];

type ParsedHoraires = {
  joursOuverts: number[];
  services: {
    matin: { actif: boolean; debut: string; fin: string };
    soir: { actif: boolean; debut: string; fin: string };
  };
  confirmation: string;
  prefill?: { joursAffluence?: number[]; postes?: string[] };
};

type State = {
  horairesText: string;
  horairesParsed: ParsedHoraires | null;
  horairesConfirm: string;
  effectifTotal: number;
  effectifMidi: number;
  effectifSoir: number;
  joursAffluence: number[];
  postes: string[];
  joursRepos: number;
  weekendEquitable: boolean;
};

const INIT: State = {
  horairesText: "",
  horairesParsed: null,
  horairesConfirm: "",
  effectifTotal: 8,
  effectifMidi: 3,
  effectifSoir: 5,
  joursAffluence: [],
  postes: [],
  joursRepos: 2,
  weekendEquitable: true,
};

const POSTES_OPTIONS = ["Cuisine", "Salle", "Bar", "Plonge", "Caisse"];
const JOURS_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

// ─── Utils ────────────────────────────────────────────────────────────────────

function buildConfig(s: State): PlanningConfig {
  const base = s.horairesParsed;
  const joursOuverts = base?.joursOuverts ?? [1, 2, 3, 4, 5, 6];

  const disponibilites: Record<number, string[]> = {};
  for (let d = 0; d <= 6; d++) {
    const svcs: string[] = [];
    if (joursOuverts.includes(d)) {
      if (base?.services.matin.actif) svcs.push("matin");
      if (base?.services.soir.actif) svcs.push("soir");
      if (svcs.length === 0) svcs.push("matin");
    }
    disponibilites[d] = svcs;
  }

  return {
    ...DEFAULT_CONFIG,
    services: {
      matin: {
        ...DEFAULT_CONFIG.services.matin,
        actif: base?.services.matin.actif ?? true,
        debut: base?.services.matin.debut ?? "11:30",
        fin: base?.services.matin.fin ?? "15:00",
        effectifStable: s.effectifMidi,
        effectifAffluence: Math.max(s.effectifMidi, Math.ceil(s.effectifMidi * 1.4)),
        joursAffluence: s.joursAffluence,
      },
      soir: {
        ...DEFAULT_CONFIG.services.soir,
        actif: base?.services.soir.actif ?? true,
        debut: base?.services.soir.debut ?? "19:00",
        fin: base?.services.soir.fin ?? "23:00",
        effectifStable: s.effectifSoir,
        effectifAffluence: Math.max(s.effectifSoir, Math.ceil(s.effectifSoir * 1.4)),
        joursAffluence: s.joursAffluence,
      },
    },
    disponibilites,
    joursReposParSemaine: s.joursRepos,
    weekendEquitable: s.weekendEquitable,
    postes: s.postes.length > 0 ? s.postes : DEFAULT_CONFIG.postes,
  };
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Stepper({
  value,
  min = 1,
  max = 20,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="border-border flex h-10 w-10 items-center justify-center rounded-full border text-lg font-medium transition-colors hover:bg-muted disabled:opacity-30"
        disabled={value <= min}
      >
        −
      </button>
      <span className="w-12 text-center text-2xl font-bold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="border-border flex h-10 w-10 items-center justify-center rounded-full border text-lg font-medium transition-colors hover:bg-muted disabled:opacity-30"
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

// ─── Modale principale ────────────────────────────────────────────────────────

export function OnboardingModal({ onDone, firstTime = true }: { onDone: () => void; firstTime?: boolean }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [s, setS] = useState<State>(INIT);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const step = STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = step === "recap";

  // Filtre les steps en fonction du contexte
  function effectiveSteps(): StepId[] {
    const base: StepId[] = ["horaires", "equipe", "effectif"];

    // Postes : toujours utile
    base.push("postes");

    // Repos : toujours utile
    base.push("repos");

    // Week-ends : seulement si ouvert le week-end
    const ouvert = s.horairesParsed?.joursOuverts ?? [1, 2, 3, 4, 5, 6];
    if (ouvert.includes(6) || ouvert.includes(0)) base.push("weekends");

    base.push("recap");
    return base;
  }

  function goNext() {
    const steps = effectiveSteps();
    const cur = steps.indexOf(step);
    if (cur < steps.length - 1) setStepIdx(STEPS.indexOf(steps[cur + 1]));
  }

  function goBack() {
    const steps = effectiveSteps();
    const cur = steps.indexOf(step);
    if (cur > 0) setStepIdx(STEPS.indexOf(steps[cur - 1]));
  }

  async function handleHorairesSubmit() {
    if (!s.horairesText.trim()) return;
    setParsing(true);
    setParseError(null);
    try {
      const res = await fetch("/api/onboarding/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "horaires", answer: s.horairesText }),
      });
      const data = (await res.json()) as ParsedHoraires & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Erreur");

      const prefillPostes = data.prefill?.postes ?? [];
      const prefillAffluence = data.prefill?.joursAffluence ?? [];

      setS((prev) => ({
        ...prev,
        horairesParsed: data,
        horairesConfirm: data.confirmation,
        // Pré-remplissage depuis la réponse
        joursAffluence: prefillAffluence.length > 0 ? prefillAffluence : prev.joursAffluence,
        postes: prefillPostes.length > 0 ? prefillPostes : prev.postes,
        effectifMidi: data.services.matin.actif ? prev.effectifMidi : 0,
        effectifSoir: data.services.soir.actif ? prev.effectifSoir : prev.effectifMidi,
      }));
      goNext();
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : "Impossible d'analyser votre réponse.");
    } finally {
      setParsing(false);
    }
  }

  function handleFinish() {
    saveConfig(buildConfig(s));
    localStorage.setItem("onboarding_done", "1");
    localStorage.setItem("onboarding_already_done", "1");
    localStorage.setItem("onboarding_team_size", String(s.effectifTotal));
    onDone();
  }

  const hasMatin = s.horairesParsed?.services.matin.actif ?? true;
  const hasSoir = s.horairesParsed?.services.soir.actif ?? true;

  const steps = effectiveSteps();
  const currentPos = steps.indexOf(step);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-background flex w-full max-w-[520px] flex-col overflow-hidden rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          {/* Dots de progression */}
          <div className="flex gap-1.5">
            {steps.map((sid, i) => (
              <span
                key={sid}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i < currentPos
                    ? "bg-primary w-3"
                    : i === currentPos
                      ? "bg-primary w-6"
                      : "bg-muted w-1.5"
                )}
              />
            ))}
          </div>
          {!firstTime && (
            <button
              type="button"
              onClick={onDone}
              className="text-muted-foreground hover:text-foreground rounded-full p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Contenu du step */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* ── Q1 : Horaires ── */}
          {step === "horaires" && (
            <div className="space-y-5">
              <div>
                <p className="text-3xl">🕐</p>
                <h2 className="mt-2 text-xl font-bold">Vos horaires d&apos;ouverture</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Décrivez simplement quand votre restaurant est ouvert.
                </p>
              </div>
              <textarea
                rows={4}
                value={s.horairesText}
                onChange={(e) => setS((p) => ({ ...p, horairesText: e.target.value }))}
                placeholder="Ex : Du lundi au samedi, service du midi de 11h30 à 15h et du soir de 19h à 23h. Fermé le dimanche."
                className="border-border bg-muted/20 focus:ring-primary/30 w-full resize-none rounded-xl border px-4 py-3 text-sm leading-relaxed outline-none focus:ring-2"
              />
              {parseError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{parseError}</p>
              )}
            </div>
          )}

          {/* ── Q2 : Équipe ── */}
          {step === "equipe" && (
            <div className="space-y-6">
              <div>
                <p className="text-3xl">👥</p>
                <h2 className="mt-2 text-xl font-bold">Votre équipe</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Combien de personnes travaillent dans votre établissement ?
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 py-4">
                <Stepper
                  value={s.effectifTotal}
                  min={1}
                  max={100}
                  onChange={(v) => setS((p) => ({ ...p, effectifTotal: v }))}
                />
                <p className="text-muted-foreground text-sm">personnes dans l&apos;équipe</p>
              </div>
            </div>
          )}

          {/* ── Q3 : Effectif par service + affluence ── */}
          {step === "effectif" && (
            <div className="space-y-6">
              <div>
                <p className="text-3xl">⚖️</p>
                <h2 className="mt-2 text-xl font-bold">L&apos;effectif habituel</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  En règle générale, combien de personnes faut-il par service ?
                </p>
              </div>

              <div className="space-y-3">
                {hasMatin && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Midi</p>
                      <p className="text-muted-foreground text-xs">
                        {s.horairesParsed?.services.matin.debut ?? "11:30"} →{" "}
                        {s.horairesParsed?.services.matin.fin ?? "15:00"}
                      </p>
                    </div>
                    <Stepper
                      value={s.effectifMidi}
                      min={1}
                      max={30}
                      onChange={(v) => setS((p) => ({ ...p, effectifMidi: v }))}
                    />
                  </div>
                )}
                {hasSoir && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Soir</p>
                      <p className="text-muted-foreground text-xs">
                        {s.horairesParsed?.services.soir.debut ?? "19:00"} →{" "}
                        {s.horairesParsed?.services.soir.fin ?? "23:00"}
                      </p>
                    </div>
                    <Stepper
                      value={s.effectifSoir}
                      min={1}
                      max={30}
                      onChange={(v) => setS((p) => ({ ...p, effectifSoir: v }))}
                    />
                  </div>
                )}
              </div>

              <div className="border-border/40 space-y-3 border-t pt-4">
                <div>
                  <p className="text-sm font-medium">
                    Y a-t-il des jours où vous avez besoin de plus de monde ?
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Sélectionnez les jours les plus chargés.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(s.horairesParsed?.joursOuverts ?? [1, 2, 3, 4, 5, 6]).map((d) => (
                    <Chip
                      key={d}
                      label={JOURS_LABELS[d]}
                      active={s.joursAffluence.includes(d)}
                      onClick={() =>
                        setS((p) => ({
                          ...p,
                          joursAffluence: p.joursAffluence.includes(d)
                            ? p.joursAffluence.filter((x) => x !== d)
                            : [...p.joursAffluence, d],
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Q4 : Postes ── */}
          {step === "postes" && (
            <div className="space-y-6">
              <div>
                <p className="text-3xl">🏷️</p>
                <h2 className="mt-2 text-xl font-bold">Les postes</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Quels types de postes y a-t-il dans votre établissement ?
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {POSTES_OPTIONS.map((p) => (
                  <Chip
                    key={p}
                    label={p}
                    active={s.postes.includes(p)}
                    onClick={() =>
                      setS((prev) => ({
                        ...prev,
                        postes: prev.postes.includes(p)
                          ? prev.postes.filter((x) => x !== p)
                          : [...prev.postes, p],
                      }))
                    }
                  />
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                Vous pourrez affiner les postes dans Paramètres.
              </p>
            </div>
          )}

          {/* ── Q5 : Repos ── */}
          {step === "repos" && (
            <div className="space-y-6">
              <div>
                <p className="text-3xl">🛌</p>
                <h2 className="mt-2 text-xl font-bold">Les repos</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Combien de jours de repos accordez-vous par semaine ?
                </p>
              </div>
              <div className="flex gap-3">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setS((p) => ({ ...p, joursRepos: n }))}
                    className={cn(
                      "flex-1 rounded-xl border py-4 text-center transition-all",
                      s.joursRepos === n
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <p className="text-2xl font-bold">{n}</p>
                    <p className="mt-0.5 text-xs opacity-80">
                      {n === 1 ? "jour" : "jours"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Q6 : Week-ends ── */}
          {step === "weekends" && (
            <div className="space-y-6">
              <div>
                <p className="text-3xl">📅</p>
                <h2 className="mt-2 text-xl font-bold">Les week-ends</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Souhaitez-vous que les week-ends travaillés soient répartis équitablement ?
                </p>
              </div>
              <div className="space-y-3">
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setS((p) => ({ ...p, weekendEquitable: v }))}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all",
                      s.weekendEquitable === v
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                        s.weekendEquitable === v ? "border-primary bg-primary" : "border-muted-foreground"
                      )}
                    >
                      {s.weekendEquitable === v && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {v ? "Oui, répartir équitablement" : "Non, je gère ça manuellement"}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {v
                          ? "L'IA distribue les week-ends de façon équitable entre les employés disponibles."
                          : "Vous définissez vous-même qui travaille le week-end."}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Récapitulatif ── */}
          {step === "recap" && (
            <div className="space-y-5">
              <div>
                <p className="text-3xl">🎉</p>
                <h2 className="mt-2 text-xl font-bold">C&apos;est prêt !</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Voici ce que l&apos;IA a compris de votre établissement.
                </p>
              </div>

              <div className="border-border divide-border divide-y rounded-xl border">
                {s.horairesConfirm && (
                  <RecapLine icon="🕐" label="Horaires" value={s.horairesConfirm} />
                )}
                <RecapLine
                  icon="👥"
                  label="Équipe"
                  value={`${s.effectifTotal} personne${s.effectifTotal > 1 ? "s" : ""}`}
                />
                <RecapLine
                  icon="⚖️"
                  label="Effectif"
                  value={
                    hasMatin && hasSoir
                      ? `${s.effectifMidi} le midi · ${s.effectifSoir} le soir`
                      : hasMatin
                        ? `${s.effectifMidi} au service`
                        : `${s.effectifSoir} au service`
                  }
                />
                {s.joursAffluence.length > 0 && (
                  <RecapLine
                    icon="📈"
                    label="Jours chargés"
                    value={s.joursAffluence.map((d) => JOURS_LABELS[d]).join(", ")}
                  />
                )}
                {s.postes.length > 0 && (
                  <RecapLine icon="🏷️" label="Postes" value={s.postes.join(", ")} />
                )}
                <RecapLine
                  icon="🛌"
                  label="Repos"
                  value={`${s.joursRepos} jour${s.joursRepos > 1 ? "s" : ""} par semaine`}
                />
                {steps.includes("weekends") && (
                  <RecapLine
                    icon="📅"
                    label="Week-ends"
                    value={s.weekendEquitable ? "Répartis équitablement" : "Gestion manuelle"}
                  />
                )}
              </div>

              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <Sparkles className="h-4 w-4 shrink-0" />
                Vous pouvez affiner ces règles à tout moment dans Paramètres.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-border flex items-center justify-between border-t px-6 py-4">
          {/* Retour */}
          <button
            type="button"
            onClick={goBack}
            className={cn(
              "text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors",
              isFirst && "invisible"
            )}
          >
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>

          {/* Passer (steps optionnels) */}
          {(step === "postes") && (
            <button
              type="button"
              onClick={goNext}
              className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 transition-colors hover:underline"
            >
              Passer
            </button>
          )}

          {/* CTA principal */}
          {step === "horaires" ? (
            <button
              type="button"
              onClick={handleHorairesSubmit}
              disabled={!s.horairesText.trim() || parsing}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {parsing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours…
                </>
              ) : (
                <>Continuer</>
              )}
            </button>
          ) : isLast ? (
            <button
              type="button"
              onClick={handleFinish}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
            >
              <Check className="h-4 w-4" /> Générer mon planning
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
            >
              Continuer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RecapLine({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-base">{icon}</span>
      <span className="text-muted-foreground w-24 shrink-0 text-xs">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
