"use client";

import { useState, useEffect } from "react";
import { ChevronRight, X, NotebookPen, CheckCircle2, Sparkles, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlanningView } from "@/components/planning/PlanningView";
import { GeneratePlanningModal } from "@/components/planning/GeneratePlanningModal";
import RevealGrid from "@/components/planning/RevealGrid";
import { cn } from "@/lib/utils";
import { mockPlannings, type PlanningRecord } from "@/lib/planning/mock-plannings";
import { employees, getShiftsForWeek } from "@/lib/planning/mock-data";

// ─── Config ──────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  actif:     { label: "Actif",     color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  brouillon: { label: "Brouillon", color: "text-amber-700 bg-amber-50 border-amber-200"       },
  archivé:   { label: "Archivé",   color: "text-slate-600 bg-slate-100 border-slate-200"      },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeStats(weekStart: string) {
  const working = getShiftsForWeek(weekStart).filter(s => s.type !== "repos" && s.start && s.end);
  const totalHeures = working.reduce((acc, s) => {
    const [sh, sm] = s.start.split(":").map(Number);
    const [eh, em] = s.end.split(":").map(Number);
    return acc + Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
  }, 0);
  return {
    totalHeures:     Math.round(totalHeures),
    employeesActifs: new Set(working.map(s => s.employeeId)).size,
  };
}

function computePeriodStats(weekStart: string) {
  const shifts = getShiftsForWeek(weekStart);
  const [y, m, d] = weekStart.split("-").map(Number);
  const days = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  });
  const avgWorking = (slice: string[]) => {
    const total = slice.reduce((sum, date) =>
      sum + new Set(shifts.filter(s => s.date === date && s.type !== "repos").map(s => s.employeeId)).size, 0
    );
    return Math.round(total / slice.length);
  };
  return {
    stable:    avgWorking(days.slice(0, 4)),
    affluence: avgWorking(days.slice(4, 6)),
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PlanningsPage() {
  const [showGenModal, setShowGenModal] = useState(false);
  const [selected, setSelected]         = useState<PlanningRecord | null>(null);
  const [annotation, setAnnotation]     = useState<Record<string, string>>({});
  const [successCount, setSuccessCount] = useState(0);
  const [showSuccess, setShowSuccess]   = useState(false);
  const [successIn, setSuccessIn]       = useState(false);

  useEffect(() => {
    if (!showSuccess) return;
    const t1 = requestAnimationFrame(() => setSuccessIn(true));
    const t2 = setTimeout(() => setSuccessIn(false), 2200);
    const t3 = setTimeout(() => setShowSuccess(false), 2700);
    return () => { cancelAnimationFrame(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [showSuccess]);

  function handlePublished(count: number) {
    setSelected(null);
    setSuccessCount(count);
    setShowSuccess(true);
    setSuccessIn(false);
  }

  const activePlanning = mockPlannings.find(p => p.statut === "actif");
  const pastPlannings  = mockPlannings.filter(p => p.statut !== "actif");
  const periodStats    = activePlanning ? computePeriodStats(activePlanning.dateDebut) : null;

  return (
    <div className="flex flex-col">

      {/* En-tête */}
      <div className="flex items-center justify-between px-4 py-4 md:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Plannings</h1>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setShowGenModal(true)}>
          <Sparkles className="h-3.5 w-3.5" /> Générer un nouveau planning
        </Button>
      </div>

      {/* Cards KPIs — effectifs par période */}
      {periodStats && (
        <div className="grid grid-cols-2 gap-3 px-4 pb-4 md:px-6">
          {[
            { icon: Users,      label: "Période stable",      sub: "Activité régulière · Lun – Jeu",    value: periodStats.stable    },
            { icon: TrendingUp, label: "Période d'affluence", sub: "Pic de fréquentation · Ven – Sam",  value: periodStats.affluence },
          ].map(({ icon: Icon, label, sub, value }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="text-primary h-5 w-5" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">{label}</p>
                  <p className="text-xl font-bold tabular-nums">{value}</p>
                  <p className="text-muted-foreground text-[10px]">{sub}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Planning actif */}
      {activePlanning && (
        <div className="px-4 pb-4 md:px-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Planning actif</span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              {activePlanning.semaine}
            </span>
          </div>
          <div className="flex overflow-hidden rounded-xl border border-border" style={{ height: 440 }}>
            <RevealGrid dateFrom={activePlanning.dateDebut} dateTo={activePlanning.dateFin} />
          </div>
        </div>
      )}

      {/* Plannings précédents */}
      <div className="border-t border-border">
        <div className="px-4 pb-3 pt-5 md:px-6">
          <h2 className="text-sm font-semibold">Plannings précédents</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                {["Planning", "Statut", "Équipe", "Heures", "Modifications", ""].map((h, i) => (
                  <th key={i} className={cn(
                    "pb-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground",
                    i === 0 ? "px-4 md:px-6" : "px-3",
                    i === 3 && "hidden md:table-cell",
                    i === 5 && "w-10",
                  )}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pastPlannings.map(planning => {
                const sc    = STATUS_CFG[planning.statut];
                const stats = computeStats(planning.dateDebut);
                return (
                  <tr
                    key={planning.id}
                    onClick={() => setSelected(planning)}
                    className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-4 md:px-6">
                      <p className="text-sm font-semibold leading-snug">{planning.nom}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{planning.semaine}</p>
                    </td>
                    <td className="px-3 py-4">
                      <span className={cn("inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", sc.color)}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <p className="text-sm font-bold tabular-nums">{stats.employeesActifs}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">/ {employees.length} employés</p>
                    </td>
                    <td className="hidden px-3 py-4 md:table-cell">
                      <p className="text-sm font-bold tabular-nums">{stats.totalHeures} h</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">planifiées</p>
                    </td>
                    <td className="px-3 py-4">
                      {planning.modifications > 0 ? (
                        <div className="inline-flex flex-col items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-center">
                          <span className="text-lg font-bold tabular-nums leading-none text-amber-700">{planning.modifications}</span>
                          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-amber-600">
                            modif{planning.modifications > 1 ? "s" : ""}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex flex-col items-center rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-center">
                          <span className="text-lg font-bold leading-none text-slate-400">—</span>
                          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-slate-400">aucune</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modale détail planning */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelected(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 flex h-[88vh] w-[92vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-background shadow-xl ring-1 ring-foreground/10">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
              <div>
                <span className="text-sm font-semibold">{selected.nom}</span>
                <span className="ml-2 text-xs text-muted-foreground">{selected.semaine}</span>
              </div>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setSelected(null)}>
                <X className="h-3.5 w-3.5" /> Fermer
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-auto px-4 pb-4 pt-3">
              <PlanningView key={selected.id} onPublished={handlePublished} />
            </div>
            <div className="shrink-0 border-t border-border px-4 py-3">
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <NotebookPen className="h-3.5 w-3.5" /> Note de modification manuelle
              </label>
              <textarea
                rows={2}
                placeholder="Ex : Thomas remplace Julie samedi soir suite à un arrêt maladie…"
                value={annotation[selected.id] ?? ""}
                onChange={e => setAnnotation(a => ({ ...a, [selected.id]: e.target.value }))}
                className="w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </>
      )}

      {/* Modale génération */}
      {showGenModal && <GeneratePlanningModal onClose={() => setShowGenModal(false)} />}

      {/* Bannière succès */}
      {showSuccess && (
        <div
          className="fixed left-1/2 z-[100] w-[min(22rem,88vw)]"
          style={{
            top: 0,
            transform: `translateX(-50%) translateY(${successIn ? "1.5rem" : "calc(-100% - 1.5rem)"})`,
            transition: successIn
              ? "transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)"
              : "transform 0.35s ease-in",
          }}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 shadow-xl">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900">Planning publié !</p>
              <p className="text-xs text-emerald-700">
                Envoyé à {successCount} personne{successCount > 1 ? "s" : ""} de votre équipe.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
