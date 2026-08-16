"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
  Copy,
  Send,
  Lock,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShiftModal } from "@/components/planning/ShiftModal";
import { employees, getShiftsForWeek } from "@/lib/planning/mock-data";
import type { Shift, ShiftType, Role, PlanningStatus } from "@/types/planning";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function parseMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function shiftHours(shift: Shift): number {
  if (shift.type === "repos" || !shift.start || !shift.end) return 0;
  const diff = parseMinutes(shift.end) - parseMinutes(shift.start);
  return Math.max(0, diff / 60);
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
    hours: "7h–15h",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  soir: {
    label: "Soir",
    hours: "15h–23h",
    className: "bg-violet-100 text-violet-800 border-violet-200",
  },
  coupure: {
    label: "Coupure",
    hours: "10h–23h",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  repos: { label: "Repos", hours: "", className: "bg-muted text-muted-foreground border-border" },
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

const STATUS_CONFIG: Record<PlanningStatus, { label: string; color: string; dot: string }> = {
  brouillon: {
    label: "Brouillon",
    color: "text-amber-700 bg-amber-50 border-amber-200",
    dot: "bg-amber-400",
  },
  publié: {
    label: "Publié",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
  modifié: {
    label: "Modifié",
    color: "text-orange-700 bg-orange-50 border-orange-200",
    dot: "bg-orange-400",
  },
  verrouillé: {
    label: "Verrouillé",
    color: "text-slate-700 bg-slate-100 border-slate-300",
    dot: "bg-slate-500",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PlanningView() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [shiftsMap, setShiftsMap] = useState<Record<string, Shift[]>>({});
  const [status, setStatus] = useState<PlanningStatus>("brouillon");
  const [publishedStatus, setPublishedStatus] = useState<PlanningStatus | null>(null);
  const [modal, setModal] = useState<{ employeeId: string; date: string } | null>(null);

  const weekStart = addDays(getWeekStart(new Date()), weekOffset * 7);
  const weekKey = toYMD(weekStart);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = weekDays[6];

  const sm = MONTH_NAMES[weekStart.getMonth()];
  const em = MONTH_NAMES[weekEnd.getMonth()];
  const weekLabel =
    sm === em
      ? `${weekStart.getDate()} – ${weekEnd.getDate()} ${em} ${weekEnd.getFullYear()}`
      : `${weekStart.getDate()} ${sm} – ${weekEnd.getDate()} ${em} ${weekEnd.getFullYear()}`;

  // Shifts pour cette semaine (mock si pas encore édité)
  const shifts: Shift[] = shiftsMap[weekKey] ?? getShiftsForWeek(weekKey);

  const todayYMD = toYMD(new Date());

  // ─── Conflits ──────────────────────────────────────────────────────────────

  const conflicts = useMemo(() => {
    const warnings: { type: "error" | "warning"; message: string }[] = [];

    employees.forEach((emp) => {
      const empShifts = shifts.filter((s) => s.employeeId === emp.id);
      const total = empShifts.reduce((sum, s) => sum + shiftHours(s), 0);
      if (total > 35) {
        warnings.push({
          type: "warning",
          message: `${emp.name} — ${total}h cette semaine (max 35h)`,
        });
      }
      // Jours consécutifs
      const workDays = empShifts
        .filter((s) => s.type !== "repos")
        .map((s) => s.date)
        .sort();
      let consecutive = 1;
      for (let i = 1; i < workDays.length; i++) {
        const prev = new Date(workDays[i - 1]);
        const curr = new Date(workDays[i]);
        const diff = (curr.getTime() - prev.getTime()) / 86400000;
        if (diff === 1) {
          consecutive++;
          if (consecutive >= 6) {
            warnings.push({
              type: "warning",
              message: `${emp.name} — ${consecutive} jours consécutifs`,
            });
          }
        } else {
          consecutive = 1;
        }
      }
    });

    return warnings;
  }, [shifts]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function saveShift(data: Omit<Shift, "id"> & { id?: string }) {
    const newShift: Shift = { ...data, id: data.id ?? crypto.randomUUID() };
    setShiftsMap((prev) => {
      const current = prev[weekKey] ?? getShiftsForWeek(weekKey);
      const without = current.filter(
        (s) => !(s.employeeId === data.employeeId && s.date === data.date)
      );
      return { ...prev, [weekKey]: [...without, newShift] };
    });
    if (publishedStatus === "publié") setStatus("modifié");
  }

  function deleteShift(shiftId: string) {
    setShiftsMap((prev) => {
      const current = prev[weekKey] ?? getShiftsForWeek(weekKey);
      return { ...prev, [weekKey]: current.filter((s) => s.id !== shiftId) };
    });
    if (publishedStatus === "publié") setStatus("modifié");
  }

  function publish() {
    setStatus("publié");
    setPublishedStatus("publié");
  }

  function toggleLock() {
    setStatus((s) => (s === "verrouillé" ? (publishedStatus ?? "brouillon") : "verrouillé"));
  }

  function copyWeek() {
    const prevKey = toYMD(addDays(weekStart, -7));
    const prevShifts = shiftsMap[prevKey] ?? getShiftsForWeek(prevKey);
    const copied: Shift[] = prevShifts.map((s) => {
      const prevDate = new Date(s.date + "T00:00:00");
      const newDate = addDays(prevDate, 7);
      return { ...s, id: crypto.randomUUID(), date: toYMD(newDate) };
    });
    setShiftsMap((prev) => ({ ...prev, [weekKey]: copied }));
    if (publishedStatus === "publié") setStatus("modifié");
  }

  const locked = status === "verrouillé";
  const modalEmployee = modal ? employees.find((e) => e.id === modal.employeeId) : null;
  const modalShift = modal
    ? shifts.find((s) => s.employeeId === modal.employeeId && s.date === modal.date)
    : undefined;

  const statusCfg = STATUS_CONFIG[status];

  return (
    <div className="flex flex-col">
      {/* Barre d'état + actions */}
      <div className="border-border bg-background flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3">
        {/* Statut */}
        <div
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
            statusCfg.color
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dot)} />
          {statusCfg.label}
        </div>

        {/* Navigation semaine */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-foreground w-52 text-center text-sm font-medium">{weekLabel}</span>
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="ml-1" onClick={() => setWeekOffset(0)}>
            Aujourd&apos;hui
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyWeek} disabled={locked}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copier sem. préc.
          </Button>
          <Button variant="outline" size="sm" onClick={toggleLock}>
            {locked ? (
              <Unlock className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Lock className="mr-1.5 h-3.5 w-3.5" />
            )}
            {locked ? "Déverrouiller" : "Verrouiller"}
          </Button>
          {status !== "publié" && (
            <Button size="sm" onClick={publish} disabled={locked}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {status === "modifié" ? "Envoyer modifications" : "Publier"}
            </Button>
          )}
          {status === "publié" && (
            <span className="text-muted-foreground text-xs">
              ✓ Publié · les employés peuvent voir
            </span>
          )}
        </div>
      </div>

      {/* Conflits */}
      {conflicts.length > 0 && (
        <div className="border-border border-b bg-amber-50 px-6 py-2">
          <div className="flex flex-wrap gap-3">
            {conflicts.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {c.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grille */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-border bg-muted/40 border-b">
              <th className="text-muted-foreground w-40 px-5 py-3 text-left text-xs font-medium tracking-wide uppercase">
                Employé
              </th>
              {weekDays.map((day, i) => {
                const isToday = toYMD(day) === todayYMD;
                const isWeekend = i >= 5;
                return (
                  <th
                    key={i}
                    className={cn("w-28 px-2 py-3 text-center", isWeekend && "bg-muted/30")}
                  >
                    <p
                      className={cn(
                        "text-xs font-medium tracking-wide uppercase",
                        isToday ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {DAY_NAMES[i]}
                    </p>
                    <p
                      className={cn(
                        "mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : isWeekend
                            ? "text-muted-foreground"
                            : "text-foreground"
                      )}
                    >
                      {day.getDate()}
                    </p>
                  </th>
                );
              })}
              <th className="text-muted-foreground w-14 px-3 py-3 text-center text-xs font-medium tracking-wide uppercase">
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {employees.map((employee, rowIdx) => {
              const empShifts = shifts.filter((s) => s.employeeId === employee.id);
              const totalH = empShifts.reduce((sum, s) => sum + shiftHours(s), 0);
              const roleCfg = ROLE_CONFIG[employee.role];

              return (
                <tr
                  key={employee.id}
                  className={cn(
                    "border-border hover:bg-muted/10 border-b transition-colors last:border-0",
                    rowIdx % 2 === 1 && "bg-muted/5"
                  )}
                >
                  {/* Employé */}
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium">{employee.name}</p>
                    <Badge variant="outline" className={cn("mt-0.5 text-xs", roleCfg.className)}>
                      {roleCfg.label}
                    </Badge>
                  </td>

                  {/* Cellules par jour */}
                  {weekDays.map((day, i) => {
                    const dateStr = toYMD(day);
                    const shift = empShifts.find((s) => s.date === dateStr);
                    const cfg = shift ? SHIFT_CONFIG[shift.type] : null;
                    const isWeekend = i >= 5;

                    return (
                      <td key={i} className={cn("px-2 py-2", isWeekend && "bg-muted/10")}>
                        {shift && shift.type !== "repos" ? (
                          <button
                            type="button"
                            onClick={() => setModal({ employeeId: employee.id, date: dateStr })}
                            className={cn(
                              "w-full rounded-lg border px-2 py-2 text-center transition-all",
                              "hover:opacity-80 hover:shadow-sm",
                              cfg?.className
                            )}
                          >
                            <p className="text-xs font-semibold">{cfg?.label}</p>
                            <p className="text-xs opacity-70">
                              {shift.start} – {shift.end}
                            </p>
                          </button>
                        ) : shift?.type === "repos" ? (
                          <button
                            type="button"
                            onClick={() => setModal({ employeeId: employee.id, date: dateStr })}
                            className="text-muted-foreground hover:text-foreground w-full py-2 text-center text-xs transition-colors"
                          >
                            Repos
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              !locked && setModal({ employeeId: employee.id, date: dateStr })
                            }
                            className={cn(
                              "group flex w-full items-center justify-center rounded-lg py-4 text-xs transition-all",
                              locked
                                ? "cursor-not-allowed"
                                : "hover:bg-primary/5 hover:border-primary/30 border border-dashed border-transparent"
                            )}
                            aria-label="Ajouter un shift"
                          >
                            {!locked && (
                              <Plus className="text-muted-foreground/40 group-hover:text-primary h-4 w-4 transition-colors" />
                            )}
                          </button>
                        )}
                      </td>
                    );
                  })}

                  {/* Total */}
                  <td className="px-3 py-3 text-center">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        totalH > 35 ? "text-amber-600" : "text-foreground"
                      )}
                    >
                      {totalH > 0 ? `${totalH}h` : "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Légende */}
      <div className="border-border flex flex-wrap items-center gap-4 border-t px-6 py-3">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Légende
        </span>
        {(Object.entries(SHIFT_CONFIG) as [ShiftType, ShiftConfig][]).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={cn("h-3 w-3 rounded-sm border", cfg.className)} />
            <span className="text-muted-foreground text-xs">{cfg.label}</span>
          </div>
        ))}
        <span className="text-muted-foreground ml-auto text-xs">
          Cliquez sur une cellule pour ajouter ou modifier un shift
        </span>
      </div>

      {/* Modal shift */}
      {modal && modalEmployee && (
        <ShiftModal
          open={!!modal}
          onClose={() => setModal(null)}
          onSave={saveShift}
          onDelete={deleteShift}
          employee={modalEmployee}
          date={modal.date}
          existingShift={modalShift}
          locked={locked}
        />
      )}
    </div>
  );
}
