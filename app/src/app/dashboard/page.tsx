"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlanningView } from "@/components/planning/PlanningView";
import { employees, getShiftsForWeek } from "@/lib/planning/mock-data";
import { mockPlannings } from "@/lib/planning/mock-plannings";

function toYMD(d: Date) { return d.toISOString().split("T")[0]; }
function getMondayOf(d: Date): Date {
  const day = d.getDay();
  const m = new Date(d);
  m.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  m.setHours(0, 0, 0, 0);
  return m;
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

const MOIS = ["jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"];
const JOURS_LONG = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];

export default function DashboardPage() {
  const today    = useMemo(() => new Date(), []);
  const todayYMD = toYMD(today);
  const monday   = getMondayOf(today);
  const weekKey  = toYMD(monday);

  const shifts = useMemo(() => getShiftsForWeek(weekKey), [weekKey]);

  const todayCount = useMemo(() =>
    shifts.filter(s => s.date === todayYMD && s.type !== "repos").length,
    [shifts, todayYMD]
  );
  const totalHours = useMemo(() => shifts.reduce((acc, s) => {
    if (s.type === "repos" || !s.start || !s.end) return acc;
    const [sh, sm] = s.start.split(":").map(Number);
    const [eh, em] = s.end.split(":").map(Number);
    return acc + Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
  }, 0), [shifts]);

  const nextMonday = toYMD(addDays(monday, 7));
  const hasNextWeek = mockPlannings.some(p => p.dateDebut <= nextMonday && p.dateFin >= nextMonday);

  const hour      = today.getHours();
  const greeting  = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const dateLabel = `${JOURS_LONG[today.getDay()]} ${today.getDate()} ${MOIS[today.getMonth()]}`;

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting} !</h1>
        <p className="text-muted-foreground text-sm capitalize">{dateLabel}</p>
      </div>

      {/* Alerte semaine prochaine */}
      {!hasNextWeek && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Planning semaine prochaine non généré</p>
            <p className="text-amber-700 text-xs mt-0.5">
              La semaine du {addDays(monday, 7).getDate()} {MOIS[addDays(monday, 7).getMonth()]} n&apos;a pas encore de planning.
            </p>
          </div>
          <Link href="/dashboard/plannings" className={buttonVariants({ size: "sm", className: "h-7 shrink-0 gap-1 text-xs bg-amber-600 hover:bg-amber-700 text-white border-0" })}>
            <Sparkles className="h-3 w-3" /> Générer
          </Link>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs">Au travail aujourd&apos;hui</p>
            <p className="mt-1 text-2xl font-bold">{todayCount}</p>
            <p className="text-muted-foreground text-[11px]">sur {employees.length} employés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs">Heures planifiées</p>
            <p className="mt-1 text-2xl font-bold">{Math.round(totalHours)}h</p>
            <p className="text-muted-foreground text-[11px]">cette semaine</p>
          </CardContent>
        </Card>
      </div>

      {/* Planning — même composant que la page Plannings */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-border" style={{ height: "clamp(340px, 50vh, 520px)" }}>
        <PlanningView hideTabs readOnly />
      </div>

    </div>
  );
}
