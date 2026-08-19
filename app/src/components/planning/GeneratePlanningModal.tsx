"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Check, Loader2, Sparkles, Users, Clock, CalendarX, Calendar } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PlanningView = dynamic(
  () => import("@/components/planning/PlanningView").then(m => ({ default: m.PlanningView })),
  { ssr: false }
);

/* ── helpers date ───────────────────────────────────────────── */

function toISO(d: Date) { return d.toISOString().split("T")[0]; }

function getNextMonday(): Date {
  const d = new Date();
  const day = d.getDay(); // 0=dim, 1=lun…
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

const MOIS_COURT = ["jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"];

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MOIS_COURT[d.getMonth()]} ${d.getFullYear()}`;
}

/* ── recap data ─────────────────────────────────────────────── */

const RECAP_CARDS = [
  {
    icon: Users,
    value: "5 / 6",
    label: "Effectif disponible",
    sub: "Nicolas en arrêt maladie",
  },
  {
    icon: Clock,
    value: "Ven · Sam · Dim",
    label: "Heures de pointe",
    sub: "Créneaux à fort volume",
  },
  {
    icon: CalendarX,
    value: "1 indisponibilité",
    label: "Posée sur la période",
    sub: "Julie · 25 août",
  },
];

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

  const [phase, setPhase]               = useState<Phase>("periode");
  const [dateFrom, setDateFrom]         = useState(toISO(nextMon));
  const [dateTo, setDateTo]             = useState(toISO(nextSun));
  const [visibleCount, setVisibleCount] = useState(0);
  const [loadingStep,  setLoadingStep]  = useState(0);
  const [revealIn,     setRevealIn]     = useState(false);

  /* stagger recap cards */
  useEffect(() => {
    if (phase !== "analyse" || visibleCount >= RECAP_CARDS.length) return;
    const t = setTimeout(() => setVisibleCount(c => c + 1), 380);
    return () => clearTimeout(t);
  }, [phase, visibleCount]);

  /* auto-advance analyse → generation */
  useEffect(() => {
    if (phase !== "analyse" || visibleCount < RECAP_CARDS.length) return;
    const t = setTimeout(() => { setLoadingStep(0); setPhase("generation"); }, 1600);
    return () => clearTimeout(t);
  }, [phase, visibleCount]);

  /* auto-advance generation steps */
  useEffect(() => {
    if (phase !== "generation") return;
    if (loadingStep >= STEPS.length) {
      const t = setTimeout(() => setPhase("reveal"), 650);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLoadingStep(s => s + 1), 900);
    return () => clearTimeout(t);
  }, [phase, loadingStep]);

  /* fade-in planning après expansion modale */
  useEffect(() => {
    if (phase !== "reveal") { setRevealIn(false); return; }
    const t = setTimeout(() => setRevealIn(true), 300);
    return () => clearTimeout(t);
  }, [phase]);

  /* escape key */
  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);
  useEffect(() => {
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [handleEsc]);

  const progress   = Math.round((loadingStep / STEPS.length) * 100);
  const periodLabel = dateFrom && dateTo
    ? `${formatDate(dateFrom)} → ${formatDate(dateTo)}`
    : "Période non définie";

  const dateValid = dateFrom && dateTo && dateFrom <= dateTo;

  /* synchro dateFrom/dateTo : si from > to, ajuste to */
  function handleFromChange(val: string) {
    setDateFrom(val);
    if (dateTo && val > dateTo) {
      const from = new Date(val + "T00:00:00");
      setDateTo(toISO(addDays(from, 6)));
    }
  }

  function handleLaunch() {
    if (!dateValid) return;
    setVisibleCount(0);
    setPhase("analyse");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-background rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col"
        style={{
          maxWidth: phase === "reveal" ? "min(1100px, 96vw)" : "448px",
          height:   phase === "reveal" ? "clamp(540px, 88vh, 860px)" : "auto",
          transition: "max-width 0.55s cubic-bezier(0.4,0,0.2,1), height 0.55s cubic-bezier(0.4,0,0.2,1)",
        }}
      >

        {/* ═══════════════  PHASE 0 — PÉRIODE  ═══════════════ */}
        {phase === "periode" && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">Nouveau planning</p>
                  <p className="text-[11px] text-muted-foreground">Définissez la période</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-5 py-6 space-y-5">
              {/* Raccourcis — en premier */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "La semaine prochaine", fn: () => {
                    const m = getNextMonday();
                    setDateFrom(toISO(m));
                    setDateTo(toISO(addDays(m, 6)));
                  }},
                  { label: "Les 2 prochaines semaines", fn: () => {
                    const m = getNextMonday();
                    setDateFrom(toISO(m));
                    setDateTo(toISO(addDays(m, 13)));
                  }},
                  { label: "Ce mois-ci", fn: () => {
                    const now = new Date();
                    const first = new Date(now.getFullYear(), now.getMonth(), 1);
                    const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    setDateFrom(toISO(first));
                    setDateTo(toISO(last));
                  }},
                ].map(s => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={s.fn}
                    className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-xs font-medium hover:bg-muted transition-colors text-center leading-snug"
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Sélecteurs de dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Début
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => handleFromChange(e.target.value)}
                    className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Fin
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={e => setDateTo(e.target.value)}
                    className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                  />
                </div>
              </div>

              {/* Résumé de la période */}
              {dateValid && (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
                  <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{periodLabel}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {Math.round((new Date(dateTo + "T00:00:00").getTime() - new Date(dateFrom + "T00:00:00").getTime()) / 86400000) + 1} jours
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-border">
              <Button
                className="w-full gap-2"
                disabled={!dateValid}
                onClick={handleLaunch}
              >
                <Sparkles className="h-4 w-4" />
                Analyser et générer
              </Button>
            </div>
          </>
        )}

        {/* ═══════════════  PHASE 1 — ANALYSE  ═══════════════ */}
        {phase === "analyse" && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">Analyse en cours…</p>
                  <p className="text-[11px] text-muted-foreground">{periodLabel}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-5 py-6 space-y-3">
              {RECAP_CARDS.map((card, i) => {
                const Icon  = card.icon;
                const shown = i < visibleCount;
                return (
                  <div
                    key={card.label}
                    className={cn(
                      "flex items-center gap-4 rounded-xl border border-border px-4 py-3.5",
                      "transition-all duration-400 ease-out",
                      shown
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-4 pointer-events-none"
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{card.value}</p>
                      <p className="text-[11px] text-muted-foreground">{card.label}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground text-right shrink-0">{card.sub}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ═══════════════  PHASE 2 — GÉNÉRATION  ════════════ */}
        {phase === "generation" && (
          <>
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Génération en cours…</p>
                  <p className="text-[11px] text-muted-foreground">{progress}% · {periodLabel}</p>
                </div>
              </div>
            </div>

            <div className="h-0.5 bg-muted">
              <div
                className="h-0.5 bg-primary transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="px-5 py-7 space-y-5">
              {STEPS.map((step, i) => {
                const done   = i < loadingStep;
                const active = i === loadingStep;
                return (
                  <div
                    key={step}
                    className={cn(
                      "flex items-center gap-3 transition-all duration-500",
                      i > loadingStep ? "opacity-20" : "opacity-100"
                    )}
                  >
                    <div className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                      done ? "bg-emerald-100" : active ? "bg-primary/10" : "bg-muted"
                    )}>
                      {done
                        ? <Check   className="h-3 w-3 text-emerald-600" />
                        : active
                          ? <Loader2 className="h-3 w-3 text-primary animate-spin" />
                          : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                      }
                    </div>
                    <span className={cn(
                      "text-sm transition-colors duration-300",
                      done ? "text-foreground font-medium" : active ? "text-foreground font-semibold" : "text-muted-foreground"
                    )}>
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
            <div className="flex shrink-0 items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                  <Check className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Planning généré !</p>
                  <p className="text-[11px] text-muted-foreground">{periodLabel}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div
              className={cn(
                "flex-1 min-h-0 transition-opacity duration-500",
                revealIn ? "opacity-100" : "opacity-0"
              )}
            >
              <PlanningView hideTabs readOnly />
            </div>

            <div
              className={cn(
                "flex shrink-0 gap-2 px-5 py-4 border-t border-border",
                "transition-opacity duration-500",
                revealIn ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Plus tard
              </Button>
              <Link
                href="/dashboard/plannings"
                onClick={onClose}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
