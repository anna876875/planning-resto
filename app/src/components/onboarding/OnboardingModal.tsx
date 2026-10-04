"use client";

import { useState } from "react";
import { ArrowLeft, Check, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveConfig, DEFAULT_CONFIG } from "@/lib/planning/config";
import type { PlanningConfig } from "@/lib/planning/config";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepId = "restaurant" | "horaires" | "effectif" | "repos" | "weekends" | "recap";
type NbServices = 1 | 2 | "continu";
type Slot = { debut: string; fin: string };

// Effectif par service pour un jour d'affluence
type AffluenceDay = { s1: number; s2: number };

type State = {
  nomRestaurant: string;
  typeRestaurant: string;
  joursOuverts: number[];
  nbServices: NbServices;
  service1: Slot;
  service2: Slot;
  effectifS1: number;       // effectif de base service 1
  effectifS2: number;       // effectif de base service 2
  joursAffluence: Record<number, AffluenceDay>; // jour → effectif sur ce jour
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

// ─── Presets ─────────────────────────────────────────────────────────────────

type Preset = {
  emoji: string;
  label: string;
  joursOuverts: number[];
  nbServices: NbServices;
  service1: Slot;
  service2: Slot;
  effectifS1: number;
  effectifS2: number;
  joursAffluence: Record<number, AffluenceDay>;
};

const TYPE_PRESETS: Record<string, Preset> = {
  restaurant: {
    emoji: "🍽️",
    label: "Restaurant",
    joursOuverts: [1, 2, 3, 4, 5, 6],
    nbServices: 2,
    service1: { debut: "12:00", fin: "15:00" },
    service2: { debut: "19:00", fin: "23:00" },
    effectifS1: 4,
    effectifS2: 6,
    joursAffluence: { 5: { s1: 4, s2: 9 }, 6: { s1: 5, s2: 10 } },
  },
  brasserie: {
    emoji: "🍺",
    label: "Brasserie / Bistrot",
    joursOuverts: [1, 2, 3, 4, 5, 6, 0],
    nbServices: 2,
    service1: { debut: "11:30", fin: "15:30" },
    service2: { debut: "18:30", fin: "23:00" },
    effectifS1: 5,
    effectifS2: 8,
    joursAffluence: { 5: { s1: 6, s2: 11 }, 6: { s1: 7, s2: 12 }, 0: { s1: 6, s2: 10 } },
  },
  cafe: {
    emoji: "☕",
    label: "Café / Bar",
    joursOuverts: [1, 2, 3, 4, 5, 6],
    nbServices: "continu",
    service1: { debut: "08:00", fin: "19:00" },
    service2: { debut: "19:00", fin: "23:00" },
    effectifS1: 4,
    effectifS2: 4,
    joursAffluence: { 5: { s1: 6, s2: 6 }, 6: { s1: 7, s2: 7 } },
  },
  pizzeria: {
    emoji: "🍕",
    label: "Pizzeria",
    joursOuverts: [3, 4, 5, 6, 0],
    nbServices: 2,
    service1: { debut: "11:30", fin: "14:30" },
    service2: { debut: "18:30", fin: "22:30" },
    effectifS1: 2,
    effectifS2: 4,
    joursAffluence: { 5: { s1: 2, s2: 6 }, 6: { s1: 3, s2: 7 }, 0: { s1: 2, s2: 5 } },
  },
  fastfood: {
    emoji: "🌮",
    label: "Restauration rapide",
    joursOuverts: [1, 2, 3, 4, 5, 6, 0],
    nbServices: "continu",
    service1: { debut: "11:00", fin: "22:00" },
    service2: { debut: "19:00", fin: "23:00" },
    effectifS1: 4,
    effectifS2: 4,
    joursAffluence: { 5: { s1: 6, s2: 6 }, 6: { s1: 7, s2: 7 } },
  },
  hotel: {
    emoji: "🏨",
    label: "Hôtel-Restaurant",
    joursOuverts: [1, 2, 3, 4, 5, 6, 0],
    nbServices: 2,
    service1: { debut: "07:00", fin: "10:30" },
    service2: { debut: "19:00", fin: "22:30" },
    effectifS1: 4,
    effectifS2: 5,
    joursAffluence: { 5: { s1: 5, s2: 7 }, 6: { s1: 6, s2: 8 }, 0: { s1: 5, s2: 7 } },
  },
};

// ─── State initial ────────────────────────────────────────────────────────────

const INIT: State = {
  nomRestaurant: "",
  typeRestaurant: "",
  joursOuverts: [1, 2, 3, 4, 5, 6],
  nbServices: 2,
  service1: { debut: "11:30", fin: "15:00" },
  service2: { debut: "19:00", fin: "23:00" },
  effectifS1: 3,
  effectifS2: 5,
  joursAffluence: {},
  joursRepos: 2,
  weekendEquitable: true,
};

// ─── buildConfig ──────────────────────────────────────────────────────────────

function buildConfig(s: State): PlanningConfig {
  const hasTwoServices = s.nbServices === 2;
  const affluenceDays = Object.keys(s.joursAffluence).map(Number);

  const maxS1 = affluenceDays.length
    ? Math.max(...Object.values(s.joursAffluence).map((v) => v.s1))
    : Math.ceil(s.effectifS1 * 1.4);

  const maxS2 = affluenceDays.length
    ? Math.max(...Object.values(s.joursAffluence).map((v) => v.s2))
    : Math.ceil(s.effectifS2 * 1.4);

  return {
    ...DEFAULT_CONFIG,
    services: {
      matin: {
        ...DEFAULT_CONFIG.services.matin,
        actif: true,
        debut: s.service1.debut,
        fin: s.service1.fin,
        effectifStable: s.effectifS1,
        effectifAffluence: Math.max(s.effectifS1, maxS1),
        joursAffluence: affluenceDays,
      },
      soir: {
        ...DEFAULT_CONFIG.services.soir,
        actif: hasTwoServices,
        debut: s.service2.debut,
        fin: s.service2.fin,
        effectifStable: hasTwoServices ? s.effectifS2 : s.effectifS1,
        effectifAffluence: hasTwoServices ? Math.max(s.effectifS2, maxS2) : Math.max(s.effectifS1, maxS1),
        joursAffluence: affluenceDays,
      },
    },
    disponibilites: Object.fromEntries(
      Array.from({ length: 7 }, (_, i) => [
        i,
        s.joursOuverts.includes(i) ? (hasTwoServices ? ["matin", "soir"] : ["matin"]) : [],
      ])
    ),
    joursReposParSemaine: s.joursRepos,
    weekendEquitable: s.weekendEquitable,
    affluenceParJour: Object.fromEntries(
      Object.entries(s.joursAffluence).map(([day, v]) => [
        Number(day),
        { matin: v.s1, soir: v.s2 },
      ])
    ),
  };
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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

function Stepper({
  value,
  min = 1,
  max = 30,
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
        disabled={value <= min}
        className="border-border flex h-9 w-9 items-center justify-center rounded-full border text-lg font-medium transition-colors hover:bg-muted disabled:opacity-30"
      >
        −
      </button>
      <span className="w-10 text-center text-xl font-bold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="border-border flex h-9 w-9 items-center justify-center rounded-full border text-lg font-medium transition-colors hover:bg-muted disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

// Stepper compact pour les panneaux d'affluence
function MiniStepper({
  value,
  min = 1,
  max = 30,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="border-border flex h-7 w-7 items-center justify-center rounded-full border text-sm font-medium transition-colors hover:bg-muted disabled:opacity-30"
      >
        −
      </button>
      <span className="w-7 text-center text-base font-bold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="border-border flex h-7 w-7 items-center justify-center rounded-full border text-sm font-medium transition-colors hover:bg-muted disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

function TimeRange({
  label,
  slot,
  onChange,
}: {
  label: string;
  slot: Slot;
  onChange: (s: Slot) => void;
}) {
  return (
    <div className="border-border flex items-center gap-3 rounded-xl border px-4 py-3">
      <span className="w-20 shrink-0 text-sm font-semibold">{label}</span>
      <div className="flex flex-1 items-center gap-2">
        <input
          type="time"
          value={slot.debut}
          onChange={(e) => onChange({ ...slot, debut: e.target.value })}
          className="border-border bg-muted/30 w-[88px] rounded-lg border px-2 py-1.5 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/30"
        />
        <span className="text-muted-foreground text-sm">→</span>
        <input
          type="time"
          value={slot.fin}
          onChange={(e) => onChange({ ...slot, fin: e.target.value })}
          className="border-border bg-muted/30 w-[88px] rounded-lg border px-2 py-1.5 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </div>
  );
}

function RecapLine({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="text-base">{icon}</span>
      <span className="text-muted-foreground w-20 shrink-0 text-xs">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

// ─── Options nombre de services ───────────────────────────────────────────────

const NB_SERVICES_OPTIONS: { value: NbServices; emoji: string; label: string; desc: string }[] = [
  { value: 1, emoji: "☀️", label: "1 service", desc: "Un seul créneau par jour" },
  { value: 2, emoji: "🍽️", label: "2 services", desc: "Midi + Soir, avec coupure" },
  { value: "continu", emoji: "⏰", label: "Continu", desc: "Sans fermeture entre les services" },
];

// ─── Composant principal ──────────────────────────────────────────────────────

export function OnboardingModal({
  onDone,
  firstTime = true,
}: {
  onDone: () => void;
  firstTime?: boolean;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [s, setS] = useState<State>(INIT);

  function effectiveSteps(): StepId[] {
    const base: StepId[] = ["restaurant", "horaires", "effectif", "repos"];
    if (s.joursOuverts.includes(6) || s.joursOuverts.includes(0)) base.push("weekends");
    base.push("recap");
    return base;
  }

  const steps = effectiveSteps();
  const step = steps[stepIdx] ?? "restaurant";
  const isFirst = stepIdx === 0;
  const isLast = step === "recap";

  function goNext() {
    if (stepIdx < steps.length - 1) setStepIdx((i) => i + 1);
  }
  function goBack() {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
  }

  function applyPreset(key: string) {
    const p = TYPE_PRESETS[key];
    if (!p) return;
    setS((prev) => ({
      ...prev,
      typeRestaurant: key,
      joursOuverts: p.joursOuverts,
      nbServices: p.nbServices,
      service1: p.service1,
      service2: p.service2,
      effectifS1: p.effectifS1,
      effectifS2: p.effectifS2,
      joursAffluence: p.joursAffluence,
    }));
  }

  function toggleJour(idx: number) {
    setS((prev) => {
      const removing = prev.joursOuverts.includes(idx);
      const newAffluence = { ...prev.joursAffluence };
      if (removing) delete newAffluence[idx];
      return {
        ...prev,
        joursOuverts: removing
          ? prev.joursOuverts.filter((d) => d !== idx)
          : [...prev.joursOuverts, idx],
        joursAffluence: newAffluence,
      };
    });
  }

  // Toggle un jour d'affluence : l'ajoute avec les valeurs de base ou le retire
  function toggleAffluence(idx: number) {
    setS((prev) => {
      const current = { ...prev.joursAffluence };
      if (idx in current) {
        delete current[idx];
      } else {
        current[idx] = { s1: prev.effectifS1, s2: prev.effectifS2 };
      }
      return { ...prev, joursAffluence: current };
    });
  }

  // Met à jour l'effectif d'un jour d'affluence pour un service
  function setAffluenceVal(day: number, field: "s1" | "s2", val: number) {
    setS((prev) => ({
      ...prev,
      joursAffluence: {
        ...prev.joursAffluence,
        [day]: { ...prev.joursAffluence[day]!, [field]: val },
      },
    }));
  }

  function handleFinish() {
    const name = s.nomRestaurant.trim() || "Mon Restaurant";
    localStorage.setItem("restaurant_name", name);
    saveConfig(buildConfig(s));
    localStorage.setItem("onboarding_done", "1");
    localStorage.setItem("onboarding_already_done", "1");
    onDone();
  }

  const canNext =
    step === "restaurant"
      ? s.typeRestaurant !== ""
      : step === "horaires"
        ? s.joursOuverts.length > 0
        : true;

  const hasTwoServices = s.nbServices === 2;
  const s1Label = hasTwoServices ? "Midi" : "Service";

  // Jours d'affluence triés dans l'ordre de la semaine
  const affluenceDaysSorted = JOURS.filter(
    ({ idx }) => idx in s.joursAffluence && s.joursOuverts.includes(idx)
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-background flex w-full max-w-[520px] flex-col overflow-hidden rounded-2xl shadow-2xl">

        {/* ── Progress dots ── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex gap-1.5">
            {steps.map((sid, i) => (
              <span
                key={sid}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i < stepIdx ? "bg-primary w-3" : i === stepIdx ? "bg-primary w-6" : "bg-muted w-1.5"
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

        {/* ── Contenu ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Étape 0 : Restaurant ── */}
          {step === "restaurant" && (
            <div className="space-y-6">
              <div>
                <p className="text-3xl">🏪</p>
                <h2 className="mt-2 text-xl font-bold">Votre établissement</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Prêt en 2 minutes — tout est modifiable ensuite.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Nom du restaurant
                </label>
                <input
                  type="text"
                  value={s.nomRestaurant}
                  onChange={(e) => setS((p) => ({ ...p, nomRestaurant: e.target.value }))}
                  placeholder="Ex : Le Bistrot du Coin"
                  className="border-border bg-background placeholder:text-muted-foreground/50 focus:ring-primary/30 w-full rounded-xl border px-4 py-3 text-sm focus:ring-2 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Type d&apos;établissement
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TYPE_PRESETS).map(([key, preset]) => {
                    const active = s.typeRestaurant === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyPreset(key)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all",
                          active
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/30 hover:bg-muted/40"
                        )}
                      >
                        <span className="text-xl">{preset.emoji}</span>
                        <span className="leading-snug">{preset.label}</span>
                        {active && <Check className="ml-auto h-3.5 w-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {s.typeRestaurant && (
                  <p className="text-muted-foreground text-[11px]">
                    ✓ Services et effectifs pré-remplis — modifiables à l&apos;étape suivante.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Étape 1 : Services & Horaires ── */}
          {step === "horaires" && (
            <div className="space-y-6">
              <div>
                <p className="text-3xl">🕐</p>
                <h2 className="mt-2 text-xl font-bold">Services et horaires</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Jours d&apos;ouverture, nombre de services et horaires.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Jours d&apos;ouverture
                </p>
                <div className="flex flex-wrap gap-2">
                  {JOURS.map(({ idx, label }) => (
                    <Chip
                      key={idx}
                      label={label}
                      active={s.joursOuverts.includes(idx)}
                      onClick={() => toggleJour(idx)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Nombre de services par jour
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {NB_SERVICES_OPTIONS.map((opt) => {
                    const active = s.nbServices === opt.value;
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => setS((p) => ({ ...p, nbServices: opt.value }))}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all",
                          active
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30 hover:bg-muted/30"
                        )}
                      >
                        <span className="text-2xl">{opt.emoji}</span>
                        <span className={cn("text-xs font-semibold", active ? "text-primary" : "")}>
                          {opt.label}
                        </span>
                        <span className="text-muted-foreground text-[10px] leading-snug">
                          {opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Horaires
                </p>
                <div className="space-y-2">
                  <TimeRange
                    label={s.nbServices === "continu" ? "Ouverture" : s1Label}
                    slot={s.service1}
                    onChange={(slot) => setS((p) => ({ ...p, service1: slot }))}
                  />
                  {hasTwoServices && (
                    <TimeRange
                      label="Soir"
                      slot={s.service2}
                      onChange={(slot) => setS((p) => ({ ...p, service2: slot }))}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Étape 2 : Effectif ── */}
          {step === "effectif" && (
            <div className="space-y-6">
              <div>
                <p className="text-3xl">⚖️</p>
                <h2 className="mt-2 text-xl font-bold">Effectif et affluence</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Définissez votre effectif habituel, puis vos jours chargés.
                </p>
              </div>

              {/* Effectif de base */}
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Effectif habituel
                </p>
                <div className="space-y-2">
                  <div className="border-border flex items-center justify-between rounded-xl border p-4">
                    <div>
                      <p className="text-sm font-semibold">{s1Label}</p>
                      <p className="text-muted-foreground text-xs">
                        {s.service1.debut} → {s.service1.fin}
                      </p>
                    </div>
                    <Stepper
                      value={s.effectifS1}
                      min={1}
                      max={30}
                      onChange={(v) => {
                        // Recalibrer les jours d'affluence si la base augmente
                        const newAffluence = Object.fromEntries(
                          Object.entries(s.joursAffluence).map(([day, val]) => [
                            day,
                            { ...val, s1: Math.max(val.s1, v) },
                          ])
                        );
                        setS((p) => ({ ...p, effectifS1: v, joursAffluence: newAffluence }));
                      }}
                    />
                  </div>

                  {hasTwoServices && (
                    <div className="border-border flex items-center justify-between rounded-xl border p-4">
                      <div>
                        <p className="text-sm font-semibold">Soir</p>
                        <p className="text-muted-foreground text-xs">
                          {s.service2.debut} → {s.service2.fin}
                        </p>
                      </div>
                      <Stepper
                        value={s.effectifS2}
                        min={1}
                        max={30}
                        onChange={(v) => {
                          const newAffluence = Object.fromEntries(
                            Object.entries(s.joursAffluence).map(([day, val]) => [
                              day,
                              { ...val, s2: Math.max(val.s2, v) },
                            ])
                          );
                          setS((p) => ({ ...p, effectifS2: v, joursAffluence: newAffluence }));
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Jours d'affluence */}
              <div className="space-y-3 border-t pt-4">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Jours d&apos;affluence
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Cochez les jours chargés et ajustez l&apos;effectif par service.
                  </p>
                </div>

                {/* Chips sélection */}
                <div className="flex flex-wrap gap-2">
                  {JOURS.filter(({ idx }) => s.joursOuverts.includes(idx)).map(({ idx, label }) => {
                    const active = idx in s.joursAffluence;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleAffluence(idx)}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
                          active
                            ? "border-orange-400 bg-orange-50 text-orange-700"
                            : "border-border text-muted-foreground hover:border-orange-300 hover:text-orange-600"
                        )}
                      >
                        {label}
                        {active && <span className="ml-1 text-[10px]">🔥</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Panneaux par jour sélectionné */}
                {affluenceDaysSorted.length > 0 && (
                  <div className="space-y-2">
                    {affluenceDaysSorted.map(({ idx, label }) => {
                      const v = s.joursAffluence[idx]!;
                      return (
                        <div
                          key={idx}
                          className="overflow-hidden rounded-xl border border-orange-200 bg-orange-50/50"
                        >
                          {/* En-tête du jour */}
                          <div className="flex items-center justify-between border-b border-orange-200/60 px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">🔥</span>
                              <span className="text-sm font-semibold text-orange-800">
                                {label}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleAffluence(idx)}
                              className="text-orange-400 hover:text-orange-600 transition-colors text-xs"
                            >
                              Retirer
                            </button>
                          </div>

                          {/* Effectif par service */}
                          <div
                            className={cn(
                              "grid gap-0 divide-x divide-orange-200/60",
                              hasTwoServices ? "grid-cols-2" : "grid-cols-1"
                            )}
                          >
                            <div className="flex items-center justify-between px-4 py-3">
                              <div>
                                <p className="text-xs font-semibold text-orange-700">{s1Label}</p>
                                <p className="text-[10px] text-orange-500/80">
                                  {s.service1.debut} → {s.service1.fin}
                                </p>
                              </div>
                              <MiniStepper
                                value={v.s1}
                                min={s.effectifS1}
                                max={30}
                                onChange={(val) => setAffluenceVal(idx, "s1", val)}
                              />
                            </div>

                            {hasTwoServices && (
                              <div className="flex items-center justify-between px-4 py-3">
                                <div>
                                  <p className="text-xs font-semibold text-orange-700">Soir</p>
                                  <p className="text-[10px] text-orange-500/80">
                                    {s.service2.debut} → {s.service2.fin}
                                  </p>
                                </div>
                                <MiniStepper
                                  value={v.s2}
                                  min={s.effectifS2}
                                  max={30}
                                  onChange={(val) => setAffluenceVal(idx, "s2", val)}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {affluenceDaysSorted.length === 0 && (
                  <p className="text-muted-foreground text-xs italic">
                    Aucun jour d&apos;affluence — effectif identique tous les jours.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Étape 3 : Repos ── */}
          {step === "repos" && (
            <div className="space-y-6">
              <div>
                <p className="text-3xl">🛌</p>
                <h2 className="mt-2 text-xl font-bold">Les repos</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Combien de jours de repos par semaine ?
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
                    <p className="mt-0.5 text-xs opacity-80">{n === 1 ? "jour" : "jours"}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Étape 4 : Week-ends (optionnelle) ── */}
          {step === "weekends" && (
            <div className="space-y-6">
              <div>
                <p className="text-3xl">📅</p>
                <h2 className="mt-2 text-xl font-bold">Les week-ends</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Répartir les week-ends équitablement entre tous ?
                </p>
              </div>
              <div className="space-y-3">
                {([true, false] as const).map((v) => (
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
                      {s.weekendEquitable === v && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {v ? "Oui, automatiquement" : "Non, je gère manuellement"}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {v
                          ? "L'IA distribue les week-ends de façon équitable."
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
                <h2 className="mt-2 text-xl font-bold">
                  {s.nomRestaurant.trim() ? `"${s.nomRestaurant}" est prêt !` : "C'est prêt !"}
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Voici la configuration de votre établissement.
                </p>
              </div>

              <div className="border-border divide-border divide-y overflow-hidden rounded-xl border">
                {s.nomRestaurant.trim() && (
                  <RecapLine icon="🏪" label="Restaurant" value={s.nomRestaurant.trim()} />
                )}
                <RecapLine
                  icon="📅"
                  label="Jours"
                  value={JOURS.filter(({ idx }) => s.joursOuverts.includes(idx))
                    .map((j) => j.label)
                    .join(", ")}
                />
                <RecapLine
                  icon="🍽️"
                  label="Services"
                  value={
                    s.nbServices === "continu"
                      ? "Continu"
                      : s.nbServices === 1
                        ? "1 service / jour"
                        : "2 services (midi + soir)"
                  }
                />
                <RecapLine
                  icon="☀️"
                  label={s.nbServices === "continu" ? "Ouverture" : s1Label}
                  value={`${s.service1.debut} → ${s.service1.fin}`}
                />
                {hasTwoServices && (
                  <RecapLine icon="🌙" label="Soir" value={`${s.service2.debut} → ${s.service2.fin}`} />
                )}
                <RecapLine
                  icon="⚖️"
                  label="Effectif"
                  value={
                    hasTwoServices
                      ? `${s.effectifS1} le midi · ${s.effectifS2} le soir`
                      : `${s.effectifS1} par service`
                  }
                />
                {affluenceDaysSorted.length > 0 && (
                  <div className="px-4 py-2.5">
                    <div className="flex items-start gap-3">
                      <span className="text-base">🔥</span>
                      <div>
                        <p className="text-muted-foreground mb-1.5 text-xs">Affluence</p>
                        <div className="space-y-0.5">
                          {affluenceDaysSorted.map(({ idx, label }) => {
                            const v = s.joursAffluence[idx]!;
                            return (
                              <p key={idx} className="text-sm font-medium">
                                {label} —{" "}
                                {hasTwoServices
                                  ? `${v.s1} midi · ${v.s2} soir`
                                  : `${v.s1} pers.`}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <RecapLine
                  icon="🛌"
                  label="Repos"
                  value={`${s.joursRepos} jour${s.joursRepos > 1 ? "s" : ""} / semaine`}
                />
              </div>

              <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <Sparkles className="h-4 w-4 shrink-0" />
                Tout est modifiable dans Paramètres.
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="border-border flex items-center justify-between border-t px-6 py-4">
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

          {isLast ? (
            <button
              type="button"
              onClick={handleFinish}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              <Check className="h-4 w-4" /> Lancer le planning
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40"
            >
              Continuer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
