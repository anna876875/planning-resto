"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { employees, getShiftsForWeek } from "@/lib/planning/mock-data";

// ─── Config ──────────────────────────────────────────────────────────────────

const DAY_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const SERVICES = [
  { key: "matin", label: "Matin", start: "07h", hours: "07:00 – 15:00", text: "text-sky-800",    dot: "bg-sky-500",    rowBg: "bg-sky-50/40"    },
  { key: "midi",  label: "Midi",  start: "11h", hours: "11:00 – 19:00", text: "text-teal-800",   dot: "bg-teal-500",   rowBg: "bg-teal-50/40"   },
  { key: "soir",  label: "Soir",  start: "15h", hours: "15:00 – 23:00", text: "text-violet-800", dot: "bg-violet-500", rowBg: "bg-violet-50/40" },
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
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().split("T")[0];
}

// ─── Composant ───────────────────────────────────────────────────────────────

export default function RevealGrid({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
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
    const mondays = [...new Set(allDays.map(getMondayOf))];
    return mondays.flatMap(wk => getShiftsForWeek(wk));
  }, [allDays]);

  // Exclure les jours fermés (aucun employé ne travaille)
  const days = useMemo(() =>
    allDays.filter(d =>
      employees.some(emp => shifts.some(s => s.employeeId === emp.id && s.date === d && s.type !== "repos"))
    ),
    [allDays, shifts]
  );

  const TH = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <th className={cn("px-3 pb-2.5 pt-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground", className)}>
      {children}
    </th>
  );

  return (
    <div className="flex min-h-0 flex-1 overflow-auto">
      <table
        className="w-full border-collapse text-xs"
        style={{ minWidth: `${200 + days.length * 120}px` }}
      >
        {/* ── En-têtes jours ── */}
        <thead>
          <tr className="border-b border-border bg-card">
            <TH className="w-44">Service</TH>
            {days.map(d => {
              const date = parseUTC(d);
              const isWeekend = date.getUTCDay() === 6 || date.getUTCDay() === 0;
              return (
                <TH key={d} className={cn("text-center", isWeekend && "opacity-60")}>
                  <span className="block">{DAY_SHORT[date.getUTCDay()]}</span>
                  <span className="block text-sm font-bold text-foreground leading-tight">{date.getUTCDate()}</span>
                </TH>
              );
            })}
          </tr>
        </thead>

        {/* ── Lignes services ── */}
        <tbody>
          {SERVICES.map((svc, svcIdx) => (
            <tr
              key={svc.key}
              className={cn(svcIdx < SERVICES.length - 1 && "border-b border-border/50")}
            >
              {/* Colonne gauche — service + horaires + heure d'embauche */}
              <td className={cn("px-3 py-4 align-top", svc.rowBg)}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", svc.dot)} />
                  <span className={cn("font-bold text-sm", svc.text)}>{svc.label}</span>
                </div>
                <p className={cn("text-[11px] pl-3.5 opacity-60", svc.text)}>{svc.hours}</p>
                <p className={cn("text-[10px] pl-3.5 mt-1 font-semibold", svc.text)}>
                  Embauche {svc.start}
                </p>
              </td>

              {/* Cellule par jour */}
              {days.map(d => {
                const date = parseUTC(d);
                const isWeekend = date.getUTCDay() === 6 || date.getUTCDay() === 0;
                const working = employees.filter(emp =>
                  shifts.some(s => s.employeeId === emp.id && s.date === d && s.type === svc.key)
                );
                return (
                  <td
                    key={d}
                    className={cn(
                      "px-2 py-3 align-top",
                      isWeekend ? "bg-muted/20" : "bg-background"
                    )}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
