"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { employees, getShiftsForWeek } from "@/lib/planning/mock-data";

// ─── Config ──────────────────────────────────────────────────────────────────

const DAY_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const SERVICES = [
  { key: "ouverture", label: "Ouverture", startH: "07h", text: "text-sky-800",    dot: "bg-sky-500",    rowBg: "bg-sky-50/40"    },
  { key: "midi",      label: "Midi",      startH: "11h", text: "text-teal-800",   dot: "bg-teal-500",   rowBg: "bg-teal-50/40"   },
  { key: "soir",      label: "Soir",      startH: "15h", text: "text-violet-800", dot: "bg-violet-500", rowBg: "bg-violet-50/40" },
] as const;

const DEPARTMENTS = [
  { label: "Cuisine", roles: ["chef_cuisine", "chef_partie"], bg: "bg-orange-100", text: "text-orange-700" },
  { label: "Salle",   roles: ["serveur"],                     bg: "bg-blue-100",   text: "text-blue-700"  },
  { label: "Bar",     roles: ["barman"],                      bg: "bg-violet-100", text: "text-violet-700"},
  { label: "Plonge",  roles: ["plongeur"],                    bg: "bg-slate-100",  text: "text-slate-600" },
];

// ─── Utils ───────────────────────────────────────────────────────────────────

function parseUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function getMondayOf(dateStr: string): string {
  const d = parseUTC(dateStr);
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return d.toISOString().split("T")[0];
}

// ─── Composant ───────────────────────────────────────────────────────────────

import type { Shift } from "@/types/planning";

export default function RevealGrid({
  dateFrom, dateTo, shifts: shiftsProp,
}: {
  dateFrom: string; dateTo: string; shifts?: Shift[];
}) {
  const allDays = useMemo(() => {
    const result: string[] = [];
    const end = parseUTC(dateTo).getTime();
    const cur = parseUTC(dateFrom);
    while (cur.getTime() <= end) {
      result.push(cur.toISOString().split("T")[0]);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return result;
  }, [dateFrom, dateTo]);

  const shifts = useMemo(() => {
    if (shiftsProp) return shiftsProp;
    const mondays = [...new Set(allDays.map(getMondayOf))];
    return mondays.flatMap(wk => getShiftsForWeek(wk));
  }, [allDays, shiftsProp]);

  const days = useMemo(() =>
    allDays.filter(d =>
      employees.some(emp =>
        shifts.some(s => s.employeeId === emp.id && s.date === d && s.type !== "repos")
      )
    ),
    [allDays, shifts]
  );

  return (
    <div className="flex min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-xs" style={{ minWidth: `${180 + days.length * 120}px` }}>

        {/* ── En-têtes jours ── */}
        <thead>
          <tr className="border-b border-border bg-card">
            <th style={{ width: 56 }} />
            {days.map(d => {
              const date = parseUTC(d);
              const isWeekend = date.getUTCDay() === 6;
              return (
                <th
                  key={d}
                  className={cn(
                    "px-3 pb-2.5 pt-3 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground",
                    isWeekend && "opacity-60"
                  )}
                >
                  <span className="block">{DAY_SHORT[date.getUTCDay()]}</span>
                  <span className="block text-sm font-bold leading-tight text-foreground">
                    {date.getUTCDate()}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* ── Lignes services ── */}
        <tbody>
          {SERVICES.map((svc, svcIdx) => (
            <>
            <tr key={svc.key} className={cn(svcIdx < SERVICES.length - 1 && "border-b border-border/50")}>

              {/* Colonne gauche — embauche + coupure (si applicable) */}
              <td className={cn("py-4 align-middle", svc.rowBg)} style={{ width: 64 }}>
                <div className="flex flex-col items-center justify-center gap-1.5 px-2">
                  <span className={cn("text-[11px] font-light tabular-nums tracking-wide select-none", svc.text)}>
                    {svc.startH}
                  </span>
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", svc.dot)} />
                </div>
              </td>

              {/* Cellules par jour */}
              {days.map(d => {
                const date = parseUTC(d);
                const isWeekend = date.getUTCDay() === 6;
                const working = employees.filter(emp =>
                  shifts.some(s => s.employeeId === emp.id && s.date === d && s.type === svc.key)
                );
                return (
                  <td
                    key={d}
                    className={cn("px-2 py-3 align-top", isWeekend ? "bg-muted/20" : "bg-background")}
                  >
                    <div className="flex flex-col gap-1">
                      {DEPARTMENTS.map(dept => {
                        const group = working.filter(emp =>
                          (dept.roles as readonly string[]).includes(emp.role)
                        );
                        if (!group.length) return null;
                        return (
                          <div key={dept.label} className={cn("rounded px-1.5 py-1", dept.bg)}>
                            <span className={cn("block text-[9px] font-bold uppercase tracking-wide mb-0.5 opacity-70", dept.text)}>
                              {dept.label}
                            </span>
                            {group.map(emp => (
                              <span key={emp.id} className={cn("block text-[11px] font-medium leading-snug whitespace-nowrap", dept.text)}>
                                {emp.name.split(" ")[0]}
                              </span>
                            ))}
                          </div>
                        );
                      })}
                      {working.length === 0 && (
                        <span className="text-muted-foreground/30 text-[10px]">—</span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Bande coupure entre Midi et Soir */}
            {svc.key === "midi" && (
              <tr key="coupure" className="border-b border-border/50">
                <td className="bg-muted/20 backdrop-blur-sm py-2 px-4" style={{ width: 64 }}>
                  <span className="text-[9px] font-light tracking-widest text-muted-foreground/60 select-none">
                    coupure
                  </span>
                </td>
                {days.map(d => (
                  <td key={d} className="bg-muted/15 backdrop-blur-sm" />
                ))}
              </tr>
            )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
