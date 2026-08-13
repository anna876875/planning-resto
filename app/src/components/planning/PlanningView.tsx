"use client";

import { useState } from "react";
import { employees, getShiftsForWeek } from "@/lib/planning/mock-data";
import type { ShiftType, Role } from "@/types/planning";

// ─── Date helpers ────────────────────────────────────────────────────────────

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

// ─── Config UI ───────────────────────────────────────────────────────────────

const SHIFT_CONFIG: Record<
  ShiftType,
  { label: string; hours: string; bg: string; text: string; dot: string }
> = {
  matin: {
    label: "Matin",
    hours: "7h – 15h",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-400",
  },
  soir: {
    label: "Soir",
    hours: "15h – 23h",
    bg: "bg-violet-50",
    text: "text-violet-700",
    dot: "bg-violet-400",
  },
  coupure: {
    label: "Coupure",
    hours: "10h-15h · 18h-23h",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
  repos: {
    label: "Repos",
    hours: "",
    bg: "bg-gray-50",
    text: "text-gray-400",
    dot: "bg-gray-300",
  },
};

const ROLE_CONFIG: Record<Role, { label: string; badge: string }> = {
  chef_cuisine: { label: "Chef cuisine", badge: "bg-red-100 text-red-700" },
  chef_partie: { label: "Chef de partie", badge: "bg-orange-100 text-orange-700" },
  serveur: { label: "Serveur", badge: "bg-sky-100 text-sky-700" },
  barman: { label: "Barman", badge: "bg-emerald-100 text-emerald-700" },
  plongeur: { label: "Plongeur", badge: "bg-gray-100 text-gray-600" },
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

  const startMonth = MONTH_NAMES[weekStart.getMonth()];
  const endMonth = MONTH_NAMES[weekEnd.getMonth()];
  const weekLabel =
    startMonth === endMonth
      ? `${weekStart.getDate()} – ${weekEnd.getDate()} ${endMonth} ${weekEnd.getFullYear()}`
      : `${weekStart.getDate()} ${startMonth} – ${weekEnd.getDate()} ${endMonth} ${weekEnd.getFullYear()}`;

  const shifts = getShiftsForWeek(toYMD(weekStart));
  const todayYMD = toYMD(new Date());

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Planning restaurant</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
              aria-label="Semaine précédente"
            >
              ←
            </button>
            <span className="w-52 text-center text-sm font-medium text-gray-700">{weekLabel}</span>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
              aria-label="Semaine suivante"
            >
              →
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="ml-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
            >
              Aujourd&apos;hui
            </button>
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="w-48 px-5 py-3 text-left text-xs font-medium tracking-wide text-gray-500 uppercase">
                    Employé
                  </th>
                  {weekDays.map((day, i) => {
                    const isToday = toYMD(day) === todayYMD;
                    const isWeekend = i >= 5;
                    return (
                      <th
                        key={i}
                        className={`w-32 px-2 py-3 text-center ${isWeekend ? "bg-gray-50" : ""}`}
                      >
                        <div
                          className={`text-xs font-medium tracking-wide uppercase ${isToday ? "text-blue-600" : "text-gray-500"}`}
                        >
                          {DAY_NAMES[i]}
                        </div>
                        <div
                          className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold ${
                            isToday
                              ? "bg-blue-600 text-white"
                              : isWeekend
                                ? "text-gray-400"
                                : "text-gray-800"
                          }`}
                        >
                          {day.getDate()}
                        </div>
                      </th>
                    );
                  })}
                  <th className="w-20 px-4 py-3 text-center text-xs font-medium tracking-wide text-gray-500 uppercase">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {employees.map((employee, rowIdx) => {
                  const employeeShifts = shifts.filter((s) => s.employeeId === employee.id);
                  const totalHours = employeeShifts.reduce(
                    (sum, s) => sum + SHIFT_HOURS[s.type],
                    0
                  );

                  return (
                    <tr
                      key={employee.id}
                      className={`border-b border-gray-100 transition-colors last:border-0 hover:bg-blue-50/30 ${
                        rowIdx % 2 === 1 ? "bg-gray-50/40" : "bg-white"
                      }`}
                    >
                      {/* Employee info */}
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_CONFIG[employee.role].badge}`}
                        >
                          {ROLE_CONFIG[employee.role].label}
                        </span>
                      </td>

                      {/* Shift cells */}
                      {weekDays.map((day, i) => {
                        const shift = employeeShifts.find((s) => s.date === toYMD(day));
                        const isWeekend = i >= 5;

                        if (!shift || shift.type === "repos") {
                          return (
                            <td
                              key={i}
                              className={`px-2 py-4 text-center ${isWeekend ? "bg-gray-50/60" : ""}`}
                            >
                              {shift?.type === "repos" ? (
                                <span className="text-xs font-medium text-gray-300">Repos</span>
                              ) : (
                                <span className="text-gray-200">—</span>
                              )}
                            </td>
                          );
                        }

                        const cfg = SHIFT_CONFIG[shift.type];
                        return (
                          <td key={i} className={`px-2 py-3 ${isWeekend ? "bg-gray-50/60" : ""}`}>
                            <div className={`rounded-lg px-3 py-2 ${cfg.bg}`}>
                              <div className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</div>
                              <div className={`mt-0.5 text-xs ${cfg.text} opacity-75`}>
                                {cfg.hours}
                              </div>
                            </div>
                          </td>
                        );
                      })}

                      {/* Total hours */}
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`text-sm font-semibold ${totalHours >= 35 ? "text-gray-800" : "text-amber-600"}`}
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
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <span className="text-xs font-medium tracking-wide text-gray-400 uppercase">Légende</span>
          {(Object.entries(SHIFT_CONFIG) as [ShiftType, (typeof SHIFT_CONFIG)[ShiftType]][]).map(
            ([type, cfg]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                <span className="text-xs text-gray-600">{cfg.label}</span>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
