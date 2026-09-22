"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { mockPlannings } from "@/lib/planning/mock-plannings";
import { employees, getShiftsForWeek } from "@/lib/planning/mock-data";
import { cn } from "@/lib/utils";

// ─── Constantes ───────────────────────────────────────────────────────────────

const JOURS_COURTS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const ROLE_GROUPE: Record<string, { label: string; order: number }> = {
  chef_cuisine: { label: "Cuisine", order: 0 },
  chef_partie: { label: "Cuisine", order: 0 },
  serveur: { label: "Salle", order: 1 },
  barman: { label: "Bar", order: 2 },
  plongeur: { label: "Plonge", order: 3 },
};

const SERVICE_CONFIG = {
  matin: { label: "Midi", icon: "☀️", color: "text-amber-600", bg: "bg-amber-50", debut: "09:00", fin: "15:00" },
  soir:  { label: "Soir", icon: "🌙", color: "text-indigo-600", bg: "bg-indigo-50", debut: "18:30", fin: "23:00" },
} as const;

// ─── Utils ────────────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().split("T")[0];
}

function getWeekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function formatDayFull(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanningDetailPage() {
  const { id } = useParams<{ id: string }>();
  const planning = mockPlannings.find((p) => p.id === id) ?? mockPlannings[0];

  const weekDays = getWeekDays(planning.dateDebut);
  const today = todayStr();
  const defaultDay = weekDays.includes(today) ? today : weekDays[0];

  const [selectedDate, setSelectedDate] = useState(defaultDay);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Centre le jour sélectionné dans la barre
  useEffect(() => {
    const idx = weekDays.indexOf(selectedDate);
    const el = scrollRef.current?.children[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [selectedDate, weekDays]);

  const allShifts = getShiftsForWeek(planning.dateDebut);

  // Shifts du jour sélectionné, hors repos
  const dayShifts = allShifts.filter(
    (sh) => sh.date === selectedDate && sh.type !== "repos"
  );

  // Groupement par service puis par rôle
  const serviceTypes = (["matin", "soir"] as const).filter((svc) =>
    dayShifts.some((sh) => sh.type === svc)
  );

  function getGroupsForService(svc: "matin" | "soir") {
    const serviceShifts = dayShifts.filter((sh) => sh.type === svc);
    const byGroupe: Record<string, { label: string; order: number; names: string[] }> = {};

    for (const sh of serviceShifts) {
      const emp = employees.find((e) => e.id === sh.employeeId);
      if (!emp) continue;
      const grp = ROLE_GROUPE[emp.role] ?? { label: emp.role, order: 99 };
      if (!byGroupe[grp.label]) {
        byGroupe[grp.label] = { ...grp, names: [] };
      }
      byGroupe[grp.label].names.push(emp.name);
    }

    return Object.values(byGroupe).sort((a, b) => a.order - b.order);
  }

  // Couverture par jour (pour les indicateurs de la barre)
  function staffCount(date: string) {
    return allShifts.filter((sh) => sh.date === date && sh.type !== "repos").length;
  }

  function handleShare() {
    void navigator.clipboard.writeText(window.location.href);
  }

  function handleDownload() {
    const csv = ["Employé,Rôle,Lun,Mar,Mer,Jeu,Ven,Sam,Dim"].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planning-${planning.semaine.replace(" ", "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col">
      {/* Barre de navigation */}
      <div className="border-border bg-background sticky top-0 z-20 flex h-12 items-center justify-between border-b px-4">
        <Link
          href="/dashboard/plannings"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Plannings
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDownload}
            className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={handleShare}
            className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* En-tête planning */}
      <div className="border-border border-b px-4 py-4">
        <h1 className="font-bold">{planning.nom}</h1>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {planning.semaine} · {planning.nbEmployes} employés · {planning.nbTurns} services
        </p>
      </div>

      {/* Sélecteur de jours */}
      <div className="border-border sticky top-12 z-10 border-b bg-background px-4 py-3">
        <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {weekDays.map((date) => {
            const jsDate = new Date(date);
            const dayLabel = JOURS_COURTS[jsDate.getUTCDay()];
            const dayNum = jsDate.getUTCDate();
            const count = staffCount(date);
            const isSelected = date === selectedDate;
            const isToday = date === today;

            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "flex min-w-[48px] flex-col items-center gap-1 rounded-xl px-2 py-2 transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span className="text-[10px] font-medium">{dayLabel}</span>
                <span className={cn("text-base font-bold leading-none", isToday && !isSelected && "text-primary")}>
                  {dayNum}
                </span>
                {/* Indicateur de couverture */}
                <div className="flex gap-0.5">
                  {count > 0 ? (
                    Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          "h-1 w-1 rounded-full",
                          isSelected ? "bg-primary-foreground/70" : "bg-primary/40"
                        )}
                      />
                    ))
                  ) : (
                    <span className={cn("h-1 w-4 rounded-full", isSelected ? "bg-primary-foreground/30" : "bg-muted-foreground/20")} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenu du jour */}
      <div className="flex flex-col gap-4 px-4 py-4">
        <p className="text-sm font-semibold capitalize">{formatDayFull(selectedDate)}</p>

        {serviceTypes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-3xl">😴</p>
            <p className="text-muted-foreground text-sm">Jour de fermeture</p>
          </div>
        ) : (
          serviceTypes.map((svc) => {
            const cfg = SERVICE_CONFIG[svc];
            const groups = getGroupsForService(svc);
            const total = groups.reduce((s, g) => s + g.names.length, 0);

            return (
              <div key={svc} className="border-border overflow-hidden rounded-xl border">
                {/* Header service */}
                <div className={cn("flex items-center justify-between px-4 py-3", cfg.bg)}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cfg.icon}</span>
                    <div>
                      <p className={cn("text-sm font-semibold leading-tight", cfg.color)}>{cfg.label}</p>
                      <p className={cn("text-[11px] font-medium opacity-70", cfg.color)}>
                        {cfg.debut} – {cfg.fin}
                      </p>
                    </div>
                  </div>
                  <span className={cn("text-xs font-medium", cfg.color)}>
                    {total} présent{total > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Groupes par rôle */}
                <div className="divide-border divide-y">
                  {groups.map((grp) => (
                    <div key={grp.label} className="px-4 py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground">{grp.label}</p>
                        <span className="text-muted-foreground text-xs">{grp.names.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {grp.names.map((name) => (
                          <span
                            key={name}
                            className="border-border bg-muted/50 rounded-full border px-2.5 py-1 text-xs font-medium"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
