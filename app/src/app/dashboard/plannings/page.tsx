"use client";

import { useState, useEffect } from "react";
import { Sparkles, CalendarDays, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GeneratePlanningModal } from "@/components/planning/GeneratePlanningModal";
import RevealGrid from "@/components/planning/RevealGrid";
import { DailyView } from "@/components/planning/DailyView";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { cn } from "@/lib/utils";
import { mockPlannings } from "@/lib/planning/mock-plannings";

type ViewMode = "semaine" | "jour";

export default function PlanningsPage() {
  const [showGenModal, setShowGenModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [firstTime, setFirstTime] = useState(true);
  const [view, setView] = useState<ViewMode>("semaine");

  useEffect(() => {
    const alreadyDone = !!localStorage.getItem("onboarding_already_done");
    setFirstTime(!alreadyDone);
    if (!localStorage.getItem("onboarding_done")) {
      setShowOnboarding(true);
    }
  }, []);

  const activePlanning = mockPlannings.find((p) => p.statut === "actif");

  return (
    <>
    {showOnboarding && (
      <OnboardingModal onDone={() => setShowOnboarding(false)} firstTime={firstTime} />
    )}
    <div className="flex flex-col gap-4 px-4 py-4 md:px-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Plannings</h1>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setShowGenModal(true)}>
          <Sparkles className="h-3.5 w-3.5" /> Générer
        </Button>
      </div>

      {/* Toggle vue */}
      <div className="border-border bg-muted/30 flex w-fit gap-1 rounded-xl border p-1">
        {(
          [
            { key: "semaine", label: "Semaine", icon: CalendarDays },
            { key: "jour", label: "Jour", icon: Clock },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              view === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {activePlanning && (
        <>
          {view === "semaine" && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                  Planning actif
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  {activePlanning.semaine}
                </span>
              </div>
              <div
                className="border-border overflow-hidden rounded-xl border"
                style={{ height: 580 }}
              >
                <RevealGrid dateFrom={activePlanning.dateDebut} dateTo={activePlanning.dateFin} />
              </div>
            </div>
          )}

          {view === "jour" && (
            <div className="border-border overflow-hidden rounded-xl border">
              <DailyView initialDate={activePlanning.dateDebut} />
            </div>
          )}
        </>
      )}

      {/* Modale génération */}
      {showGenModal && <GeneratePlanningModal onClose={() => setShowGenModal(false)} />}
    </div>
    </>
  );
}
