"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { employees, getShiftsForWeek } from "@/lib/planning/mock-data";

const DAY_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const DEPARTMENTS = [
  { label: "Cuisine", roles: ["chef_cuisine", "chef_partie"], bg: "bg-orange-100/80", text: "text-orange-700" },
  { label: "Salle",   roles: ["serveur"],                     bg: "bg-blue-100/80",   text: "text-blue-700"  },
  { label: "Bar",     roles: ["barman"],                      bg: "bg-violet-100/80", text: "text-violet-700"},
  { label: "Plonge",  roles: ["plongeur"],                    bg: "bg-slate-100/80",  text: "text-slate-500" },
];

const SERVICES = [
  { key: "matin",   label: "Matin",   text: "text-sky-800",    dot: "bg-sky-400",    cellBg: "bg-sky-50/60"    },
  { key: "coupure", label: "Coupure", text: "text-amber-800",  dot: "bg-amber-400",  cellBg: "bg-amber-50/60"  },
  { key: "soir",    label: "Soir",    text: "text-violet-800", dot: "bg-violet-400", cellBg: "bg-violet-50/60" },
] as const;

function parseUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function getMondayOf(dateStr: string): string {
  const d = parseUTC(dateStr);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().split("T")[0];
}

export default function RevealGrid({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const days = useMemo(() => {
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
    const mondays = [...new Set(days.map(getMondayOf))];
    return mondays.flatMap(wk => getShiftsForWeek(wk));
  }, [days]);

  return (
    <div className="overflow-auto flex-1 min-h-0 px-5 py-4">
      <table className="w-full text-xs border-separate border-spacing-0" style={{ minWidth: `${140 + days.length * 110}px` }}>

        {/* ── En-tête jours ── */}
        <thead>
          <tr>
            <th className="w-24 py-3 px-3 border-b border-border/40" />
            {days.map(d => {
              const date = parseUTC(d);
              const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
              return (
                <th key={d} className="text-center py-3 px-3 border-b border-border/40">
                  <span className={cn("block text-[10px] font-medium uppercase tracking-wide", weekend ? "text-muted-foreground/60" : "text-muted-foreground")}>
                    {DAY_SHORT[date.getUTCDay()]}
                  </span>
                  <span className={cn("block text-[15px] font-bold leading-tight", weekend ? "text-muted-foreground/70" : "text-foreground")}>
                    {date.getUTCDate()}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* ── Lignes : Matin / Coupure / Soir ── */}
        <tbody>
          {SERVICES.map((svc, svcIdx) => (
            <tr key={svc.key}>
              {/* Label service */}
              <td className={cn(
                "py-4 px-3 align-top",
                svcIdx < SERVICES.length - 1 && "border-b border-border/30"
              )}>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", svc.dot)} />
                  <span className={cn("font-semibold text-[11px] whitespace-nowrap", svc.text)}>{svc.label}</span>
                </div>
              </td>

              {/* Cellule par jour */}
              {days.map(d => {
                const date = parseUTC(d);
                const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
                const working = employees.filter(emp =>
                  shifts.some(s => s.employeeId === emp.id && s.date === d && s.type === svc.key)
                );
                return (
                  <td
                    key={d}
                    className={cn(
                      "py-4 px-3 align-top",
                      svcIdx < SERVICES.length - 1 && "border-b border-border/30",
                      working.length > 0 ? svc.cellBg : weekend ? "bg-muted/10" : ""
                    )}
                  >
                    <div className="flex flex-col gap-1.5">
                      {DEPARTMENTS.map(dept => {
                        const group = working.filter(emp =>
                          (dept.roles as readonly string[]).includes(emp.role)
                        );
                        if (!group.length) return null;
                        return (
                          <div key={dept.label} className={cn("rounded-md px-2 py-1.5", dept.bg)}>
                            <span className={cn("block text-[10px] font-semibold mb-0.5", dept.text)}>
                              {dept.label}
                            </span>
                            {group.map(emp => (
                              <span key={emp.id} className={cn("block text-[11px] leading-snug whitespace-nowrap", dept.text)}>
                                {emp.name.split(" ")[0]}
                              </span>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
