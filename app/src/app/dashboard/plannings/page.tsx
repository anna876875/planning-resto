"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ChevronRight, Users, CalendarDays, Clock } from "lucide-react";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { GeneratePlanningModal } from "@/components/planning/GeneratePlanningModal";
import { mockPlannings } from "@/lib/planning/mock-plannings";
import { cn } from "@/lib/utils";

const STATUT_LABELS = {
  actif: "Actif",
  archivé: "Archivé",
  brouillon: "Brouillon",
};

function formatDateRange(debut: string, fin: string) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return `${fmt(debut)} – ${fmt(fin)}`;
}

export default function PlanningsPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [firstTime, setFirstTime] = useState(true);
  const [showGenModal, setShowGenModal] = useState(false);

  useEffect(() => {
    const alreadyDone = !!localStorage.getItem("onboarding_already_done");
    setFirstTime(!alreadyDone);
    if (!localStorage.getItem("onboarding_done")) setShowOnboarding(true);
  }, []);

  const actif = mockPlannings.find((p) => p.statut === "actif");
  const historique = mockPlannings.filter((p) => p.statut !== "actif");

  return (
    <>
      {showOnboarding && (
        <OnboardingModal onDone={() => setShowOnboarding(false)} firstTime={firstTime} />
      )}

      <div className="flex flex-col gap-6 px-4 py-5">
        {/* Titre */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Plannings</h1>
          <button
            onClick={() => setShowGenModal(true)}
            className="bg-primary text-primary-foreground flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium"
          >
            <Sparkles className="h-3.5 w-3.5" /> Générer
          </button>
        </div>

        {/* Planning actif */}
        {actif && (
          <section className="space-y-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              En cours
            </p>
            <Link href={`/dashboard/plannings/${actif.id}`}>
              <div className="border-primary/20 bg-primary/5 rounded-xl border p-4 transition-all active:scale-[0.99]">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <p className="font-semibold">{actif.nom}</p>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {formatDateRange(actif.dateDebut, actif.dateFin)} · {actif.semaine}
                    </p>
                  </div>
                  <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0 mt-0.5" />
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Users className="text-muted-foreground h-3.5 w-3.5" />
                    <span>{actif.nbEmployes} employés</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Clock className="text-muted-foreground h-3.5 w-3.5" />
                    <span>{actif.nbTurns} services</span>
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Historique */}
        {historique.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Historique
            </p>
            <div className="border-border overflow-hidden rounded-xl border">
              {historique.map((p, i) => (
                <Link key={p.id} href={`/dashboard/plannings/${p.id}`}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-muted",
                      i < historique.length - 1 && "border-border border-b"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                        <p className="truncate text-sm font-medium">{p.nom}</p>
                      </div>
                      <p className="text-muted-foreground mt-0.5 pl-5 text-xs">
                        {formatDateRange(p.dateDebut, p.dateFin)} · {p.nbEmployes} emp.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground rounded-full bg-muted px-2 py-0.5 text-[11px]">
                        {STATUT_LABELS[p.statut]}
                      </span>
                      <ChevronRight className="text-muted-foreground h-4 w-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {showGenModal && <GeneratePlanningModal onClose={() => setShowGenModal(false)} />}
    </>
  );
}
