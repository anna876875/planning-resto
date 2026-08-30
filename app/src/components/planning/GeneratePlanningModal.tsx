"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Check, Loader2, Sparkles, Users, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { generateWeekSchedule, type GenerationResult } from "@/lib/planning/generator";
import { loadConfig } from "@/lib/planning/config";
import { employees } from "@/lib/planning/mock-data";
import type { Shift } from "@/types/planning";

const RevealGrid = dynamic(() => import("./RevealGrid"), { ssr: false });

/* ── helpers date ───────────────────────────────────────────── */

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getNextMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getMondayOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay();
  dt.setUTCDate(dt.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return dt.toISOString().split("T")[0];
}

function getMondaysInRange(from: string, to: string): string[] {
  const mondays = new Set<string>();
  const [y, m, d] = from.split("-").map(Number);
  const cur = new Date(Date.UTC(y, m - 1, d));
  const end = new Date(to + "T00:00:00Z");
  while (cur <= end) {
    mondays.add(getMondayOf(cur.toISOString().split("T")[0]));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return [...mondays];
}

const MOIS_COURT = [
  "jan",
  "fév",
  "mar",
  "avr",
  "mai",
  "juin",
  "juil",
  "août",
  "sep",
  "oct",
  "nov",
  "déc",
];

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MOIS_COURT[d.getMonth()]} ${d.getFullYear()}`;
}

/* ── étapes de génération ───────────────────────────────────── */

const STEPS = [
  "Analyse des disponibilités",
  "Vérification des contraintes légales",
  "Optimisation des weekends",
  "Équilibrage des services",
  "Validation du planning",
];

/* ── composant ───────────────────────────────────────────────── */

type Phase = "periode" | "analyse" | "generation" | "reveal";

export function GeneratePlanningModal({ onClose }: { onClose: () => void }) {
  const nextMon = getNextMonday();
  const nextSun = addDays(nextMon, 6);

  const [phase, setPhase] = useState<Phase>("periode");
  const [dateFrom, setDateFrom] = useState(toISO(nextMon));
  const [dateTo, setDateTo] = useState(toISO(nextSun));
  const [activeShortcut, setActiveShortcut] = useState<string>("La semaine prochaine");
  const [showCustom, setShowCustom] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [revealIn, setRevealIn] = useState(false);

  const [generatedShifts, setGeneratedShifts] = useState<Shift[]>([]);
  const [genResult, setGenResult] = useState<GenerationResult | null>(null);
  const generationDoneRef = useRef(false);

  /* analyse → génération */
  useEffect(() => {
    if (phase !== "analyse") return;
    const t = setTimeout(() => {
      setLoadingStep(0);
      setPhase("generation");
    }, 900);
    return () => clearTimeout(t);
  }, [phase]);

  /* étapes de génération */
  useEffect(() => {
    if (phase !== "generation") return;

    if (loadingStep >= STEPS.length) {
      const t = setTimeout(() => setPhase("reveal"), 500);
      return () => clearTimeout(t);
    }

    // Lancer la vraie génération à mi-parcours
    if (loadingStep === 2 && !generationDoneRef.current) {
      generationDoneRef.current = true;
      const cfg = loadConfig();
      const mondays = getMondaysInRange(dateFrom, dateTo);
      const allShifts: Shift[] = [];
      const allWarnings: string[] = [];
      let lastResult: GenerationResult | null = null;
      let totalHeures = 0;

      for (const monday of mondays) {
        const result = generateWeekSchedule(monday, employees, cfg);
        allShifts.push(...result.shifts);
        allWarnings.push(...result.warnings);
        totalHeures += result.stats.heuresTotal;
        lastResult = result;
      }

      const mergedResult: GenerationResult | null = lastResult
        ? {
            ...lastResult,
            shifts: allShifts,
            warnings: allWarnings,
            stats: { ...lastResult.stats, heuresTotal: totalHeures },
          }
        : null;

      setGeneratedShifts(allShifts);
      setGenResult(mergedResult);
    }

    const t = setTimeout(() => setLoadingStep((s) => s + 1), 800);
    return () => clearTimeout(t);
  }, [phase, loadingStep, dateFrom, dateTo]);

  /* fade-in */
  useEffect(() => {
    if (phase !== "reveal") {
      setRevealIn(false);
      return;
    }
    const t = setTimeout(() => setRevealIn(true), 300);
    return () => clearTimeout(t);
  }, [phase]);

  /* escape */
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );
  useEffect(() => {
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [handleEsc]);

  const progress = Math.round((loadingStep / STEPS.length) * 100);
  const periodLabel =
    dateFrom && dateTo ? `${formatDate(dateFrom)} → ${formatDate(dateTo)}` : "Période non définie";
  const dateValid = dateFrom && dateTo && dateFrom <= dateTo;

  function handleFromChange(val: string) {
    setActiveShortcut("Date personnalisée");
    setDateFrom(val);
    if (dateTo && val > dateTo) {
      setDateTo(toISO(addDays(new Date(val + "T00:00:00"), 6)));
    }
  }

  function handleLaunch() {
    if (!dateValid) return;
    generationDoneRef.current = false;
    setGenResult(null);
    setGeneratedShifts([]);
    setPhase("analyse");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-background flex w-full flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{
          maxWidth: phase === "reveal" ? "min(1100px, 96vw)" : "448px",
          height: phase === "reveal" ? "clamp(540px, 88vh, 860px)" : "auto",
          transition:
            "max-width 0.55s cubic-bezier(0.4,0,0.2,1), height 0.55s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* ═══════════════  PHASE 0 — PÉRIODE  ═══════════════ */}
        {phase === "periode" && (
          <>
            <div className="border-border flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-semibold tracking-tight">Générer le planning</h2>
              <button
                onClick={onClose}
                className="hover:bg-muted flex h-7 w-7 items-center justify-center rounded-md transition-colors"
              >
                <X className="text-muted-foreground h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                Choisir la période
              </p>

              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: "La semaine prochaine",
                    fn: () => {
                      const m = getNextMonday();
                      setDateFrom(toISO(m));
                      setDateTo(toISO(addDays(m, 6)));
                      setActiveShortcut("La semaine prochaine");
                      setShowCustom(false);
                    },
                  },
                  {
                    label: "Les 2 prochaines semaines",
                    fn: () => {
                      const m = getNextMonday();
                      setDateFrom(toISO(m));
                      setDateTo(toISO(addDays(m, 13)));
                      setActiveShortcut("Les 2 prochaines semaines");
                      setShowCustom(false);
                    },
                  },
                  {
                    label: "Ce mois-ci",
                    fn: () => {
                      const now = new Date();
                      setDateFrom(toISO(new Date(now.getFullYear(), now.getMonth(), 1)));
                      setDateTo(toISO(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
                      setActiveShortcut("Ce mois-ci");
                      setShowCustom(false);
                    },
                  },
                  {
                    label: "Date personnalisée",
                    fn: () => {
                      setShowCustom((c) => !c);
                      setActiveShortcut("Date personnalisée");
                    },
                  },
                ].map((s) => {
                  const isActive = activeShortcut === s.label;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={s.fn}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-center text-xs leading-snug font-medium transition-colors",
                        isActive
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-muted/30 text-foreground hover:bg-muted"
                      )}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>

              {showCustom && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                      Premier jour
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => handleFromChange(e.target.value)}
                      className="border-border bg-muted/30 focus:ring-primary/30 w-full rounded-xl border px-3 py-2.5 text-sm transition-all outline-none focus:ring-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                      Dernier jour
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      min={dateFrom}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="border-border bg-muted/30 focus:ring-primary/30 w-full rounded-xl border px-3 py-2.5 text-sm transition-all outline-none focus:ring-2"
                    />
                  </div>
                </div>
              )}

              {dateValid && (
                <p className="text-muted-foreground text-[12px] italic">
                  Le planning couvrira{" "}
                  {Math.round(
                    (new Date(dateTo + "T00:00:00").getTime() -
                      new Date(dateFrom + "T00:00:00").getTime()) /
                      86400000
                  ) + 1}{" "}
                  jours, du {formatDate(dateFrom)} au {formatDate(dateTo)}.
                </p>
              )}
            </div>

            <div className="px-5 pb-5">
              <Button className="w-full gap-2" disabled={!dateValid} onClick={handleLaunch}>
                <Sparkles className="h-4 w-4" />
                Analyser et générer
              </Button>
            </div>
          </>
        )}

        {/* ═══════════════  PHASE 1 — ANALYSE  ═══════════════ */}
        {phase === "analyse" && (
          <>
            <div className="border-border flex items-center justify-between border-b px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
                  <Sparkles className="text-primary h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm leading-tight font-semibold">Analyse en cours…</p>
                  <p className="text-muted-foreground text-[11px]">{periodLabel}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="hover:bg-muted flex h-7 w-7 items-center justify-center rounded-md transition-colors"
              >
                <X className="text-muted-foreground h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-3 px-5 py-8">
              <Loader2 className="text-primary h-6 w-6 animate-spin" />
              <p className="text-muted-foreground text-sm">Lecture de la configuration…</p>
            </div>
          </>
        )}

        {/* ═══════════════  PHASE 2 — GÉNÉRATION  ════════════ */}
        {phase === "generation" && (
          <>
            <div className="border-border border-b px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
                  <Loader2 className="text-primary h-4 w-4 animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Génération en cours…</p>
                  <p className="text-muted-foreground text-[11px]">
                    {progress}% · {periodLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted h-0.5">
              <div
                className="bg-primary h-0.5 transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-5 px-5 py-7">
              {STEPS.map((step, i) => {
                const done = i < loadingStep;
                const active = i === loadingStep;
                return (
                  <div
                    key={step}
                    className={cn(
                      "flex items-center gap-3 transition-all duration-500",
                      i > loadingStep ? "opacity-20" : "opacity-100"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                        done ? "bg-emerald-100" : active ? "bg-primary/10" : "bg-muted"
                      )}
                    >
                      {done ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : active ? (
                        <Loader2 className="text-primary h-3 w-3 animate-spin" />
                      ) : (
                        <span className="bg-muted-foreground/30 h-1.5 w-1.5 rounded-full" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-sm transition-colors duration-300",
                        done
                          ? "text-foreground font-medium"
                          : active
                            ? "text-foreground font-semibold"
                            : "text-muted-foreground"
                      )}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ═══════════════  PHASE 3 — RÉVÉLATION  ════════════ */}
        {phase === "reveal" && (
          <>
            <div className="border-border flex shrink-0 items-center justify-between border-b px-5 py-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                  <Check className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Planning généré !</p>
                  <p className="text-muted-foreground text-[11px]">{periodLabel}</p>
                </div>
                {genResult && (
                  <div className="text-muted-foreground ml-2 flex shrink-0 items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {genResult.stats.totalEmployes} employés
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {genResult.stats.heuresTotal}h
                    </span>
                    {genResult.warnings.length > 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        {genResult.warnings.length} alerte{genResult.warnings.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="hover:bg-muted ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors"
              >
                <X className="text-muted-foreground h-4 w-4" />
              </button>
            </div>

            {genResult && genResult.warnings.length > 0 && (
              <div className="shrink-0 px-5 pt-3">
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="mb-1 text-[11px] font-medium text-amber-800">
                    {genResult.warnings.length} contrainte{genResult.warnings.length > 1 ? "s" : ""}{" "}
                    non respectée{genResult.warnings.length > 1 ? "s" : ""}
                  </p>
                  <ul className="space-y-0.5">
                    {genResult.warnings.slice(0, 3).map((w, i) => (
                      <li key={i} className="text-[10px] text-amber-700">
                        · {w}
                      </li>
                    ))}
                    {genResult.warnings.length > 3 && (
                      <li className="text-[10px] text-amber-600 italic">
                        +{genResult.warnings.length - 3} autres…
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            <div
              className={cn(
                "mt-2 flex min-h-0 flex-1 flex-col transition-opacity duration-500",
                revealIn ? "opacity-100" : "opacity-0"
              )}
            >
              <RevealGrid
                dateFrom={dateFrom}
                dateTo={dateTo}
                shifts={generatedShifts.length > 0 ? generatedShifts : undefined}
              />
            </div>

            <div
              className={cn(
                "border-border flex shrink-0 gap-2 border-t px-5 py-4",
                "transition-opacity duration-500",
                revealIn ? "opacity-100" : "pointer-events-none opacity-0"
              )}
            >
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Plus tard
              </Button>
              <Link
                href="/dashboard/plannings"
                onClick={onClose}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors"
              >
                <Check className="h-4 w-4" />
                Voir le planning
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
