"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { employees, getShiftsForWeek } from "@/lib/planning/mock-data";

// ─── Timeline config ──────────────────────────────────────────────────────────

const DAY_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const START_H = 7;
const END_H   = 23;
const PX_H    = 44; // pixels per hour — spacing proportionnel au temps

const HOURS = Array.from({ length: END_H - START_H + 1 }, (_, i) => START_H + i);

// 4 embauches : 2 matin (07h, 11h) + 2 soir (15h, 19h)
const SHIFTS = [
  { key: "ouverture", startH: 7,  endH: 15, label: "07h", bg: "bg-sky-50/90",    border: "border-sky-200",    text: "text-sky-700"    },
  { key: "midi",      startH: 11, endH: 19, label: "11h", bg: "bg-teal-50/90",   border: "border-teal-200",   text: "text-teal-700"   },
  { key: "soir",      startH: 15, endH: 23, label: "15h", bg: "bg-violet-50/90", border: "border-violet-200", text: "text-violet-700" },
  { key: "fermeture", startH: 19, endH: 23, label: "19h", bg: "bg-rose-50/90",   border: "border-rose-200",   text: "text-rose-700"   },
] as const;

type ShiftKey = (typeof SHIFTS)[number]["key"];

const COL_W  = 52; // largeur d'une bande (px)
const TOTAL_H = (END_H - START_H) * PX_H; // 704px

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

  // Jours ouverts uniquement (exclut dimanche / jours sans employé)
  const days = useMemo(() =>
    allDays.filter(d =>
      employees.some(emp =>
        shifts.some(s => s.employeeId === emp.id && s.date === d && s.type !== "repos")
      )
    ),
    [allDays, shifts]
  );

  const dayW = SHIFTS.length * COL_W; // largeur totale d'un jour

  return (
    <div className="flex flex-col min-h-0 flex-1 overflow-hidden">

      {/* ── En-têtes jours (fixes) ── */}
      <div className="flex shrink-0 border-b border-border bg-card z-10">
        <div className="shrink-0" style={{ width: 36 }} />
        {days.map(d => {
          const date = parseUTC(d);
          const isWeekend = date.getUTCDay() === 6;
          return (
            <div
              key={d}
              className={cn(
                "flex flex-col items-center border-l border-border/30 py-2",
                isWeekend && "bg-muted/20"
              )}
              style={{ width: dayW, minWidth: dayW }}
            >
              <span className="text-[8px] font-thin tracking-[0.2em] uppercase text-muted-foreground/40">
                {DAY_SHORT[date.getUTCDay()]}
              </span>
              <span className="text-sm font-semibold leading-tight">{date.getUTCDate()}</span>
            </div>
          );
        })}
      </div>

      {/* ── Timeline scrollable ── */}
      <div className="flex flex-1 overflow-auto">

        {/* Axe horaire — typo la plus fine */}
        <div className="relative shrink-0 border-r border-border/15" style={{ width: 36, height: TOTAL_H }}>
          {HOURS.map(h => (
            <div
              key={h}
              className="absolute right-1.5"
              style={{ top: (h - START_H) * PX_H - 5 }}
            >
              <span className="text-[8px] font-thin tabular-nums leading-none text-muted-foreground/30 select-none">
                {String(h).padStart(2, "0")}h
              </span>
            </div>
          ))}
        </div>

        {/* Colonnes jours */}
        <div
          className="relative flex"
          style={{ height: TOTAL_H, minWidth: `${days.length * dayW}px` }}
        >
          {/* Lignes guide horizontales proportionnelles au temps */}
          {HOURS.map(h => (
            <div
              key={h}
              className={cn(
                "absolute inset-x-0 border-t pointer-events-none",
                [7, 11, 15, 19, 23].includes(h) ? "border-border/30" : "border-border/7"
              )}
              style={{ top: (h - START_H) * PX_H }}
            />
          ))}

          {/* Un bloc par jour */}
          {days.map(d => {
            const date = parseUTC(d);
            const isWeekend = date.getUTCDay() === 6;
            return (
              <div
                key={d}
                className={cn(
                  "relative flex shrink-0 border-l border-border/20",
                  isWeekend && "bg-muted/8"
                )}
                style={{ width: dayW }}
              >
                {/* 4 bandes : ouverture | midi | soir | fermeture */}
                {SHIFTS.map((svc, i) => {
                  const working = employees.filter(emp =>
                    shifts.some(s =>
                      s.employeeId === emp.id && s.date === d && s.type === svc.key
                    )
                  );
                  return (
                    <div
                      key={svc.key}
                      className="relative"
                      style={{
                        width: COL_W,
                        borderLeft: i > 0 ? "1px solid rgba(0,0,0,0.04)" : undefined,
                      }}
                    >
                      {working.length > 0 && (
                        <div
                          className={cn(
                            "absolute inset-x-0.5 rounded-md border overflow-hidden",
                            svc.bg,
                            svc.border
                          )}
                          style={{
                            top:    (svc.startH - START_H) * PX_H + 2,
                            height: (svc.endH - svc.startH) * PX_H - 4,
                          }}
                        >
                          <div className="px-1.5 pt-1.5">
                            {/* Heure d'embauche — typo la plus fine */}
                            <span className={cn(
                              "block text-[7px] font-thin tracking-widest tabular-nums mb-1 opacity-50",
                              svc.text
                            )}>
                              {svc.label}
                            </span>
                            {/* Prénoms alignés à l'heure d'embauche */}
                            {working.map(emp => (
                              <span
                                key={emp.id}
                                className={cn(
                                  "block text-[10px] font-medium leading-snug whitespace-nowrap overflow-hidden text-ellipsis",
                                  svc.text
                                )}
                              >
                                {emp.name.split(" ")[0]}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
