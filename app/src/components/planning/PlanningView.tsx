"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { employees, getShiftsForWeek } from "@/lib/planning/mock-data";
import type { ShiftType, Role } from "@/types/planning";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toYMD(date: Date): string {
  return date.toISOString().split("T")[0];
}

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_NAMES = [
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

// ─── Config ──────────────────────────────────────────────────────────────────

type ShiftConfig = { label: string; hours: string; className: string };

const SHIFT_CONFIG: Record<ShiftType, ShiftConfig> = {
  matin: {
    label: "Matin",
    hours: "7h – 15h",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  soir: {
    label: "Soir",
    hours: "15h – 23h",
    className: "bg-violet-100 text-violet-800 border-violet-200",
  },
  coupure: {
    label: "Coupure",
    hours: "10h · 18h",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  repos: {
    label: "Repos",
    hours: "",
    className: "bg-muted text-muted-foreground border-border",
  },
};

const ROLE_CONFIG: Record<Role, { label: string; className: string }> = {
  chef_cuisine: { label: "Chef cuisine", className: "bg-red-100 text-red-800 border-red-200" },
  chef_partie: {
    label: "Chef de partie",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  serveur: { label: "Serveur", className: "bg-sky-100 text-sky-800 border-sky-200" },
  barman: { label: "Barman", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  plongeur: { label: "Plongeur", className: "bg-muted text-muted-foreground border-border" },
};

const SHIFT_HOURS: Record<ShiftType, number> = {
  matin: 8,
  soir: 8,
  coupure: 10,
  repos: 0,
};

// ─── Component ───────────────────────────────────────────────────────────────

export function PlanningView() {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = addDays(getWeekStart(new Date()), weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = weekDays[6];

  const sm = MONTH_NAMES[weekStart.getMonth()];
  const em = MONTH_NAMES[weekEnd.getMonth()];
  const weekLabel =
    sm === em
      ? `${weekStart.getDate()} – ${weekEnd.getDate()} ${em} ${weekEnd.getFullYear()}`
      : `${weekStart.getDate()} ${sm} – ${weekEnd.getDate()} ${em} ${weekEnd.getFullYear()}`;

  const shifts = getShiftsForWeek(toYMD(weekStart));
  const todayYMD = toYMD(new Date());

  return (
    <div className="bg-background">
      {/* Navigation semaine */}
      <div className="border-border bg-muted/30 flex items-center justify-center gap-2 border-b px-6 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setWeekOffset((w) => w - 1)}
          aria-label="Semaine précédente"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-foreground w-56 text-center text-sm font-medium">{weekLabel}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setWeekOffset((w) => w + 1)}
          aria-label="Semaine suivante"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="ml-2" onClick={() => setWeekOffset(0)}>
          Aujourd&apos;hui
        </Button>
      </div>

      {/* Grid */}
      <main className="px-6 py-6">
        <div className="bg-card border-border overflow-hidden rounded-xl border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              {/* Day headers */}
              <thead>
                <tr className="border-border bg-muted/50 border-b">
                  <th className="text-muted-foreground w-44 px-5 py-3 text-left text-xs font-medium tracking-wide uppercase">
                    Employé
                  </th>
                  {weekDays.map((day, i) => {
                    const isToday = toYMD(day) === todayYMD;
                    const isWeekend = i >= 5;
                    return (
                      <th
                        key={i}
                        className={`w-28 px-2 py-3 text-center ${isWeekend ? "bg-muted/30" : ""}`}
                      >
                        <p
                          className={`text-xs font-medium tracking-wide uppercase ${isToday ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {DAY_NAMES[i]}
                        </p>
                        <p
                          className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold ${
                            isToday
                              ? "bg-primary text-primary-foreground"
                              : isWeekend
                                ? "text-muted-foreground"
                                : "text-foreground"
                          }`}
                        >
                          {day.getDate()}
                        </p>
                      </th>
                    );
                  })}
                  <th className="text-muted-foreground w-16 px-4 py-3 text-center text-xs font-medium tracking-wide uppercase">
                    Total
                  </th>
                </tr>
              </thead>

              {/* Employee rows */}
              <tbody>
                {employees.map((employee, rowIdx) => {
                  const employeeShifts = shifts.filter((s) => s.employeeId === employee.id);
                  const totalHours = employeeShifts.reduce(
                    (sum, s) => sum + SHIFT_HOURS[s.type],
                    0
                  );
                  const roleCfg = ROLE_CONFIG[employee.role];

                  return (
                    <tr
                      key={employee.id}
                      className={`border-border hover:bg-muted/20 border-b transition-colors last:border-0 ${
                        rowIdx % 2 === 1 ? "bg-muted/10" : ""
                      }`}
                    >
                      {/* Name + role */}
                      <td className="px-5 py-4">
                        <p className="text-foreground text-sm font-medium">{employee.name}</p>
                        <Badge
                          variant="outline"
                          className={`mt-1 text-xs font-medium ${roleCfg.className}`}
                        >
                          {roleCfg.label}
                        </Badge>
                      </td>

                      {/* Shift cells */}
                      {weekDays.map((day, i) => {
                        const shift = employeeShifts.find((s) => s.date === toYMD(day));
                        const isWeekend = i >= 5;
                        const cfg = shift ? SHIFT_CONFIG[shift.type] : null;

                        return (
                          <td key={i} className={`px-2 py-3 ${isWeekend ? "bg-muted/20" : ""}`}>
                            {cfg ? (
                              shift?.type === "repos" ? (
                                <p className="text-muted-foreground text-center text-xs">Repos</p>
                              ) : (
                                <div
                                  className={`rounded-lg border px-2 py-2 text-center ${cfg.className}`}
                                >
                                  <p className="text-xs font-semibold">{cfg.label}</p>
                                  <p className="mt-0.5 text-xs opacity-75">{cfg.hours}</p>
                                </div>
                              )
                            ) : (
                              <p className="text-muted-foreground/40 text-center text-sm">—</p>
                            )}
                          </td>
                        );
                      })}

                      {/* Weekly total */}
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`text-sm font-semibold ${
                            totalHours < 35 ? "text-amber-600" : "text-foreground"
                          }`}
                        >
                          {totalHours}h
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Légende
          </span>
          {(Object.entries(SHIFT_CONFIG) as [ShiftType, ShiftConfig][]).map(([type, cfg]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`h-3 w-3 rounded-sm border ${cfg.className}`} />
              <span className="text-muted-foreground text-xs">{cfg.label}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
