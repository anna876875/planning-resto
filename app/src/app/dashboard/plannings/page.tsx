"use client";

import { useState, useEffect } from "react";
import { Clock, Users, CalendarDays, ChevronRight, Plus, X, NotebookPen, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanningView } from "@/components/planning/PlanningView";
import { cn } from "@/lib/utils";
import { mockPlannings, type PlanningRecord } from "@/lib/planning/mock-plannings";
import { employees, getShiftsForWeek } from "@/lib/planning/mock-data";

const STATUS_CFG = {
  actif:     { label: "Actif",     color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  brouillon: { label: "Brouillon", color: "text-amber-700   bg-amber-50   border-amber-200"   },
  archivé:   { label: "Archivé",   color: "text-slate-600   bg-slate-100  border-slate-200"   },
} as const;

function computeStats(dateDebut: string) {
  const shifts  = getShiftsForWeek(dateDebut);
  const working = shifts.filter((s) => s.type !== "repos" && s.start && s.end);
  const totalHeures = working.reduce((acc, s) => {
    const [sh, sm] = s.start.split(":").map(Number);
    const [eh, em] = s.end.split(":").map(Number);
    return acc + Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
  }, 0);
  return {
    totalHeures: Math.round(totalHeures),
    employeesActifs: new Set(working.map((s) => s.employeeId)).size,
    nbTurns: working.length,
  };
}

export default function PlanningsPage() {
  const [selected, setSelected]   = useState<PlanningRecord | null>(null);
  const [annotation, setAnnotation]   = useState<Record<string, string>>({});
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

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-border bg-background sticky top-0 z-10 flex h-14 items-center justify-between border-b px-4 md:px-6">
        <h1 className="text-base font-semibold">Plannings</h1>
        <Button size="sm" className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Nouveau
        </Button>
      </div>

      {/* Liste */}
      <div className="divide-border divide-y">
        {mockPlannings.map((planning) => {
          const sc    = STATUS_CFG[planning.statut];
          const stats = computeStats(planning.dateDebut);
          return (
            <button
              key={planning.id}
              type="button"
              onClick={() => setSelected(planning)}
              className="hover:bg-muted/40 flex w-full items-center gap-4 px-4 py-4 text-left transition-colors md:px-6"
            >
              <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <CalendarDays className="text-muted-foreground h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{planning.nom}</p>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", sc.color)}>
                    {sc.label}
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">{planning.semaine}</p>
                <div className="mt-2 flex flex-wrap gap-4">
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Users className="h-3.5 w-3.5" />
                    {stats.employeesActifs} / {employees.length} employés
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Clock className="h-3.5 w-3.5" />
                    {stats.totalHeures} h planifiées
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {stats.nbTurns} shifts
                  </span>
                </div>
              </div>

              <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Modale planning */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelected(null)} />
          <div className="fixed top-1/2 left-1/2 z-50 flex h-[88vh] w-[92vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-background shadow-xl ring-1 ring-foreground/10">
            {/* Header */}
            <div className="border-border flex h-12 shrink-0 items-center justify-between border-b px-4">
              <div>
                <span className="text-sm font-semibold">{selected.nom}</span>
                <span className="text-muted-foreground ml-2 text-xs">{selected.semaine}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Planning */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <PlanningView key={selected.id} onPublished={handlePublished} />
            </div>

            {/* Annotation */}
            <div className="border-border shrink-0 border-t px-4 py-3">
              <label className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
                <NotebookPen className="h-3.5 w-3.5" /> Note de modification manuelle
              </label>
              <textarea
                rows={2}
                placeholder="Ex : Thomas remplace Julie samedi soir suite à un arrêt maladie…"
                value={annotation[selected.id] ?? ""}
                onChange={(e) => setAnnotation((a) => ({ ...a, [selected.id]: e.target.value }))}
                className="border-border bg-muted/30 focus:ring-ring w-full resize-none rounded-lg border px-3 py-2 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2"
              />
            </div>
          </div>
        </>
      )}

      {/* Bannière succès slide-from-top */}
      {showSuccess && (
        <div
          className="fixed left-1/2 z-[100] w-[min(22rem,88vw)]"
          style={{
            transform: `translateX(-50%) translateY(${successIn ? "1.5rem" : "calc(-100% - 1.5rem)"})`,
            transition: successIn
              ? "transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)"
              : "transform 0.35s ease-in",
            top: 0,
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
