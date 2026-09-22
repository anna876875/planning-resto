"use client";

import { useState } from "react";
import { ArrowLeft, Check, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveConfig, DEFAULT_CONFIG } from "@/lib/planning/config";
import type { PlanningConfig } from "@/lib/planning/config";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepId = "horaires" | "equipe" | "effectif" | "postes" | "repos" | "weekends" | "recap";
const STEPS: StepId[] = ["horaires", "equipe", "effectif", "postes", "repos", "weekends", "recap"];

type Slot = { debut: string; fin: string };
type DaySchedule = { slots: Slot[] }; // 1 slot = service continu, 2 slots = coupure

type State = {
  joursOuverts: number[];
  schedules: Record<number, DaySchedule>;
  effectifTotal: number;
  effectifMidi: number;
  effectifSoir: number;
  joursAffluence: number[];
  postes: string[];
  joursRepos: number;
  weekendEquitable: boolean;
};

const JOURS = [
  { idx: 1, label: "Lun" },
  { idx: 2, label: "Mar" },
  { idx: 3, label: "Mer" },
  { idx: 4, label: "Jeu" },
  { idx: 5, label: "Ven" },
  { idx: 6, label: "Sam" },
  { idx: 0, label: "Dim" },
];
const JOUR_ORDER = JOURS.map((j) => j.idx);

const DEFAULT_SCHEDULE: DaySchedule = { slots: [{ debut: "11:30", fin: "15:00" }] };
const DEFAULT_JOURS = [1, 2, 3, 4, 5, 6];

function cloneSched(s: DaySchedule): DaySchedule {
  return { slots: s.slots.map((sl) => ({ ...sl })) };
}

const INIT: State = {
  joursOuverts: DEFAULT_JOURS,
  schedules: Object.fromEntries(DEFAULT_JOURS.map((d) => [d, cloneSched(DEFAULT_SCHEDULE)])),
  effectifTotal: 8,
  effectifMidi: 3,
  effectifSoir: 5,
  joursAffluence: [],
  postes: [],
  joursRepos: 2,
  weekendEquitable: true,
};

const POSTES_OPTIONS = ["Cuisine", "Salle", "Bar", "Plonge", "Caisse"];

// ─── buildConfig ─────────────────────────────────────────────────────────────

function buildConfig(s: State): PlanningConfig {
  const firstDay = JOUR_ORDER.find((d) => s.joursOuverts.includes(d));
  const ref = firstDay !== undefined ? (s.schedules[firstDay] ?? DEFAULT_SCHEDULE) : DEFAULT_SCHEDULE;
  const slot0 = ref.slots[0] ?? { debut: "11:30", fin: "15:00" };
  const slot1 = ref.slots[1] ?? null;

  const disponibilites: Record<number, string[]> = {};
  for (let d = 0; d <= 6; d++) {
    if (!s.joursOuverts.includes(d)) { disponibilites[d] = []; continue; }
    const sched = s.schedules[d] ?? ref;
    disponibilites[d] = sched.slots.length >= 2 ? ["matin", "soir"] : ["matin"];
  }

  return {
    ...DEFAULT_CONFIG,
    services: {
      matin: {
        ...DEFAULT_CONFIG.services.matin,
        actif: true,
        debut: slot0.debut,
        fin: slot0.fin,
        effectifStable: s.effectifMidi,
        effectifAffluence: Math.max(s.effectifMidi, Math.ceil(s.effectifMidi * 1.4)),
        joursAffluence: s.joursAffluence,
      },
      soir: {
        ...DEFAULT_CONFIG.services.soir,
        actif: slot1 !== null,
        debut: slot1?.debut ?? "19:00",
        fin: slot1?.fin ?? "23:00",
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

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground")}>
      {label}
    </button>
  );
}

function Stepper({ value, min = 1, max = 20, onChange }: { value: number; min?: number; max?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}
        className="border-border flex h-10 w-10 items-center justify-center rounded-full border text-lg font-medium transition-colors hover:bg-muted disabled:opacity-30">−</button>
      <span className="w-12 text-center text-2xl font-bold tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}
        className="border-border flex h-10 w-10 items-center justify-center rounded-full border text-lg font-medium transition-colors hover:bg-muted disabled:opacity-30">+</button>
    </div>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input type="time" value={value} onChange={(e) => onChange(e.target.value)}
      className="border-border bg-muted/30 w-[88px] rounded-lg border px-2 py-1.5 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/30" />
  );
}

// ─── Modale principale ────────────────────────────────────────────────────────

export function OnboardingModal({ onDone, firstTime = true }: { onDone: () => void; firstTime?: boolean }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [s, setS] = useState<State>(INIT);

  const step = STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = step === "recap";

  function effectiveSteps(): StepId[] {
    const base: StepId[] = ["horaires", "equipe", "effectif", "postes", "repos"];
    if (s.joursOuverts.includes(6) || s.joursOuverts.includes(0)) base.push("weekends");
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

  function propagateOrUpdate(dayIdx: number, newSched: DaySchedule) {
    const firstDay = JOUR_ORDER.find((d) => s.joursOuverts.includes(d));
    if (dayIdx === firstDay) {
      const propagated = Object.fromEntries(s.joursOuverts.map((d) => [d, cloneSched(newSched)]));
      setS((p) => ({ ...p, schedules: { ...p.schedules, ...propagated } }));
    } else {
      setS((p) => ({ ...p, schedules: { ...p.schedules, [dayIdx]: newSched } }));
    }
  }

  function updateSlot(dayIdx: number, slotIdx: number, field: "debut" | "fin", value: string) {
    const cur = s.schedules[dayIdx] ?? DEFAULT_SCHEDULE;
    const slots = cur.slots.map((sl, i) => i === slotIdx ? { ...sl, [field]: value } : sl);
    propagateOrUpdate(dayIdx, { slots });
  }

  function addSlot(dayIdx: number) {
    const cur = s.schedules[dayIdx] ?? DEFAULT_SCHEDULE;
    const newSlot: Slot = { debut: "19:00", fin: "23:00" };
    propagateOrUpdate(dayIdx, { slots: [...cur.slots, newSlot] });
  }

  function removeSlot(dayIdx: number, slotIdx: number) {
    const cur = s.schedules[dayIdx] ?? DEFAULT_SCHEDULE;
    propagateOrUpdate(dayIdx, { slots: cur.slots.filter((_, i) => i !== slotIdx) });
  }

  function toggleJour(idx: number) {
    if (s.joursOuverts.includes(idx)) {
      setS((p) => ({ ...p, joursOuverts: p.joursOuverts.filter((d) => d !== idx) }));
    } else {
      const firstDay = JOUR_ORDER.find((d) => s.joursOuverts.includes(d));
      const ref = firstDay !== undefined ? (s.schedules[firstDay] ?? DEFAULT_SCHEDULE) : DEFAULT_SCHEDULE;
      setS((p) => ({
        ...p,
        joursOuverts: [...p.joursOuverts, idx],
        schedules: { ...p.schedules, [idx]: cloneSched(ref) },
      }));
    }
  }

  function handleFinish() {
    saveConfig(buildConfig(s));
    localStorage.setItem("onboarding_done", "1");
    localStorage.setItem("onboarding_already_done", "1");
    localStorage.setItem("onboarding_team_size", String(s.effectifTotal));
    onDone();
  }

  const steps = effectiveSteps();
  const currentPos = steps.indexOf(step);
  const firstDay = JOUR_ORDER.find((d) => s.joursOuverts.includes(d));
  const refSched = firstDay !== undefined ? (s.schedules[firstDay] ?? DEFAULT_SCHEDULE) : DEFAULT_SCHEDULE;
  const hasCoupure = s.joursOuverts.some((d) => (s.schedules[d]?.slots.length ?? 0) >= 2);
  const canNext = step === "horaires" ? s.joursOuverts.length > 0 : true;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-background flex w-full max-w-[520px] flex-col overflow-hidden rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex gap-1.5">
            {steps.map((sid, i) => (
              <span key={sid} className={cn("h-1.5 rounded-full transition-all duration-300",
                i < currentPos ? "bg-primary w-3" : i === currentPos ? "bg-primary w-6" : "bg-muted w-1.5")} />
            ))}
          </div>
          {!firstTime && (
            <button type="button" onClick={onDone} className="text-muted-foreground hover:text-foreground rounded-full p-1 transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-6 py-6">

          {/* ── Q1 : Horaires ── */}
          {step === "horaires" && (
            <div className="space-y-5">
              <div>
                <p className="text-3xl">🕐</p>
                <h2 className="mt-2 text-xl font-bold">Jours et horaires</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Choisissez vos jours et saisissez les horaires du premier — les autres se calquent dessus.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {JOURS.map(({ idx, label }) => (
                  <Chip key={idx} label={label} active={s.joursOuverts.includes(idx)} onClick={() => toggleJour(idx)} />
                ))}
              </div>

              {s.joursOuverts.length > 0 && (
                <div className="border-border divide-border divide-y overflow-hidden rounded-xl border">
                  {JOURS.filter(({ idx }) => s.joursOuverts.includes(idx)).map(({ idx, label }) => {
                    const sched = s.schedules[idx] ?? DEFAULT_SCHEDULE;
                    const isFirst = idx === firstDay;
                    return (
                      <div key={idx} className={cn("px-4 py-3 space-y-2", isFirst && "bg-primary/[0.03]")}>
                        <div className="flex items-center gap-2">
                          <span className="w-7 text-xs font-semibold">{label}</span>
                          {/* Slots */}
                          <div className="flex flex-1 flex-wrap gap-x-3 gap-y-1.5">
                            {sched.slots.map((slot, si) => (
                              <div key={si} className="flex items-center gap-1">
                                <TimeInput value={slot.debut} onChange={(v) => updateSlot(idx, si, "debut", v)} />
                                <span className="text-muted-foreground text-xs">→</span>
                                <TimeInput value={slot.fin} onChange={(v) => updateSlot(idx, si, "fin", v)} />
                                {si > 0 && (
                                  <button type="button" onClick={() => removeSlot(idx, si)}
                                    className="text-muted-foreground hover:text-foreground ml-0.5 text-sm leading-none">×</button>
                                )}
                              </div>
                            ))}
                            {sched.slots.length < 2 && (
                              <button type="button" onClick={() => addSlot(idx)}
                                className="text-muted-foreground hover:text-primary self-center text-xs transition-colors">
                                + coupure
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Q2 : Équipe ── */}
          {step === "equipe" && (
            <div className="space-y-6">
              <div>
                <p className="text-3xl">👥</p>
                <h2 className="mt-2 text-xl font-bold">Votre équipe</h2>
                <p className="text-muted-foreground mt-1 text-sm">Combien de personnes travaillent dans votre établissement ?</p>
              </div>
              <div className="flex flex-col items-center gap-2 py-4">
                <Stepper value={s.effectifTotal} min={1} max={100} onChange={(v) => setS((p) => ({ ...p, effectifTotal: v }))} />
                <p className="text-muted-foreground text-sm">personnes dans l&apos;équipe</p>
              </div>
            </div>
          )}

          {/* ── Q3 : Effectif par service ── */}
          {step === "effectif" && (
            <div className="space-y-6">
              <div>
                <p className="text-3xl">⚖️</p>
                <h2 className="mt-2 text-xl font-bold">Effectif habituel</h2>
                <p className="text-muted-foreground mt-1 text-sm">Combien de personnes faut-il par service ?</p>
              </div>
              <div className="space-y-4">
                {refSched.slots[0] && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{hasCoupure ? "Midi" : "Service"}</p>
                      <p className="text-muted-foreground text-xs">{refSched.slots[0].debut} → {refSched.slots[0].fin}</p>
                    </div>
                    <Stepper value={s.effectifMidi} min={1} max={30} onChange={(v) => setS((p) => ({ ...p, effectifMidi: v }))} />
                  </div>
                )}
                {hasCoupure && refSched.slots[1] && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Soir</p>
                      <p className="text-muted-foreground text-xs">{refSched.slots[1].debut} → {refSched.slots[1].fin}</p>
                    </div>
                    <Stepper value={s.effectifSoir} min={1} max={30} onChange={(v) => setS((p) => ({ ...p, effectifSoir: v }))} />
                  </div>
                )}
              </div>
              <div className="border-border/40 space-y-3 border-t pt-4">
                <p className="text-sm font-medium">Jours les plus chargés</p>
                <div className="flex flex-wrap gap-2">
                  {JOURS.filter(({ idx }) => s.joursOuverts.includes(idx)).map(({ idx, label }) => (
                    <Chip key={idx} label={label} active={s.joursAffluence.includes(idx)}
                      onClick={() => setS((p) => ({
                        ...p,
                        joursAffluence: p.joursAffluence.includes(idx)
                          ? p.joursAffluence.filter((x) => x !== idx)
                          : [...p.joursAffluence, idx],
                      }))} />
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
                <p className="text-muted-foreground mt-1 text-sm">Quels types de postes y a-t-il ?</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {POSTES_OPTIONS.map((p) => (
                  <Chip key={p} label={p} active={s.postes.includes(p)}
                    onClick={() => setS((prev) => ({
                      ...prev,
                      postes: prev.postes.includes(p) ? prev.postes.filter((x) => x !== p) : [...prev.postes, p],
                    }))} />
                ))}
              </div>
              <p className="text-muted-foreground text-xs">Vous pourrez affiner dans Paramètres.</p>
            </div>
          )}

          {/* ── Q5 : Repos ── */}
          {step === "repos" && (
            <div className="space-y-6">
              <div>
                <p className="text-3xl">🛌</p>
                <h2 className="mt-2 text-xl font-bold">Les repos</h2>
                <p className="text-muted-foreground mt-1 text-sm">Combien de jours de repos par semaine ?</p>
              </div>
              <div className="flex gap-3">
                {[1, 2, 3].map((n) => (
                  <button key={n} type="button" onClick={() => setS((p) => ({ ...p, joursRepos: n }))}
                    className={cn("flex-1 rounded-xl border py-4 text-center transition-all",
                      s.joursRepos === n ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50")}>
                    <p className="text-2xl font-bold">{n}</p>
                    <p className="mt-0.5 text-xs opacity-80">{n === 1 ? "jour" : "jours"}</p>
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
                <p className="text-muted-foreground mt-1 text-sm">Répartir les week-ends équitablement ?</p>
              </div>
              <div className="space-y-3">
                {([true, false] as const).map((v) => (
                  <button key={String(v)} type="button" onClick={() => setS((p) => ({ ...p, weekendEquitable: v }))}
                    className={cn("flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all",
                      s.weekendEquitable === v ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
                    <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                      s.weekendEquitable === v ? "border-primary bg-primary" : "border-muted-foreground")}>
                      {s.weekendEquitable === v && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{v ? "Oui, répartir équitablement" : "Non, je gère manuellement"}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {v ? "L'IA distribue les week-ends de façon équitable." : "Vous définissez vous-même qui travaille le week-end."}
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
                <p className="text-muted-foreground mt-1 text-sm">Voici la configuration de votre établissement.</p>
              </div>
              <div className="border-border divide-border divide-y rounded-xl border">
                <RecapLine icon="📅" label="Jours"
                  value={JOURS.filter(({ idx }) => s.joursOuverts.includes(idx)).map((j) => j.label).join(", ")} />
                {refSched.slots[0] && (
                  <RecapLine icon="☀️" label={hasCoupure ? "Midi" : "Service"} value={`${refSched.slots[0].debut} → ${refSched.slots[0].fin}`} />
                )}
                {hasCoupure && refSched.slots[1] && (
                  <RecapLine icon="🌙" label="Soir" value={`${refSched.slots[1].debut} → ${refSched.slots[1].fin}`} />
                )}
                <RecapLine icon="👥" label="Équipe" value={`${s.effectifTotal} personne${s.effectifTotal > 1 ? "s" : ""}`} />
                <RecapLine icon="⚖️" label="Effectif"
                  value={hasCoupure ? `${s.effectifMidi} le midi · ${s.effectifSoir} le soir` : `${s.effectifMidi} par service`} />
                {s.joursAffluence.length > 0 && (
                  <RecapLine icon="📈" label="Chargés"
                    value={JOURS.filter(({ idx }) => s.joursAffluence.includes(idx)).map((j) => j.label).join(", ")} />
                )}
                {s.postes.length > 0 && <RecapLine icon="🏷️" label="Postes" value={s.postes.join(", ")} />}
                <RecapLine icon="🛌" label="Repos" value={`${s.joursRepos} jour${s.joursRepos > 1 ? "s" : ""} / semaine`} />
                {steps.includes("weekends") && (
                  <RecapLine icon="📅" label="Week-ends" value={s.weekendEquitable ? "Équitable" : "Manuel"} />
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
          <button type="button" onClick={goBack}
            className={cn("text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors", isFirst && "invisible")}>
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          {step === "postes" && (
            <button type="button" onClick={goNext}
              className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 transition-colors hover:underline">
              Passer
            </button>
          )}
          {isLast ? (
            <button type="button" onClick={handleFinish}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors">
              <Check className="h-4 w-4" /> Générer mon planning
            </button>
          ) : (
            <button type="button" onClick={goNext} disabled={!canNext}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-40">
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
      <span className="text-muted-foreground w-20 shrink-0 text-xs">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
