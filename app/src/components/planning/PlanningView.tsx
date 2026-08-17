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

function shiftDuration(shift: Shift): number {
  if (shift.type === "repos" || !shift.start || !shift.end) return 0;
  return Math.max(0, (parseMinutes(shift.end) - parseMinutes(shift.start)) / 60);
}

const DAY_SHORT  = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_SHORT = ["jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"];

// ─── Config ──────────────────────────────────────────────────────────────────

const SHIFT_CONFIG: Record<ShiftType, { label: string; short: string; className: string; dot: string }> = {
  matin:    { label: "Matin",   short: "M",  className: "bg-blue-50   text-blue-800   border-blue-200",   dot: "bg-blue-400"   },
  soir:     { label: "Soir",    short: "S",  className: "bg-violet-50 text-violet-800 border-violet-200", dot: "bg-violet-400" },
  coupure:  { label: "Coupure", short: "C",  className: "bg-amber-50  text-amber-800  border-amber-200",  dot: "bg-amber-400"  },
  repos:    { label: "Repos",   short: "—",  className: "bg-muted/40  text-muted-foreground border-border", dot: "bg-muted-foreground" },
};

const ROLE_COLORS: Record<Role, string> = {
  chef_cuisine: "bg-red-100    text-red-700",
  chef_partie:  "bg-orange-100 text-orange-700",
  serveur:      "bg-sky-100    text-sky-700",
  barman:       "bg-emerald-100 text-emerald-700",
  plongeur:     "bg-slate-100  text-slate-600",
};

const STATUS_CONFIG: Record<PlanningStatus, { label: string; color: string; dot: string }> = {
  brouillon:  { label: "Brouillon",  color: "text-amber-700   bg-amber-50   border-amber-200",   dot: "bg-amber-400"   },
  publié:     { label: "Publié",     color: "text-emerald-700 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  modifié:    { label: "Modifié",    color: "text-orange-700  bg-orange-50  border-orange-200",  dot: "bg-orange-400"  },
  verrouillé: { label: "Verrouillé", color: "text-slate-700   bg-slate-100  border-slate-200",   dot: "bg-slate-500"   },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PlanningView() {
  const [weekOffset, setWeekOffset]       = useState(0);
  const [shiftsMap, setShiftsMap]         = useState<Record<string, Shift[]>>({});
  const [status, setStatus]               = useState<PlanningStatus>("brouillon");
  const [publishedStatus, setPublished]   = useState<PlanningStatus | null>(null);
  const [modal, setModal]                 = useState<{ employeeId: string; date: string } | null>(null);

  // ─── Dates ─────────────────────────────────────────────────────────────────

  const weekStart = addDays(getWeekStart(new Date()), weekOffset * 7);
  const weekKey   = toYMD(weekStart);
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd   = weekDays[6];
  const todayYMD  = toYMD(new Date());

  const sm = MONTH_SHORT[weekStart.getMonth()];
  const em = MONTH_SHORT[weekEnd.getMonth()];
  const weekLabel =
    sm === em
      ? `${weekStart.getDate()} – ${weekEnd.getDate()} ${em} ${weekEnd.getFullYear()}`
      : `${weekStart.getDate()} ${sm} – ${weekEnd.getDate()} ${em} ${weekEnd.getFullYear()}`;

  const shifts: Shift[] = shiftsMap[weekKey] ?? getShiftsForWeek(weekKey);

  // ─── Conflits ──────────────────────────────────────────────────────────────

  const conflicts = useMemo(() => {
    const w: { message: string }[] = [];
    employees.forEach((emp) => {
      const es = shifts.filter((s) => s.employeeId === emp.id);
      const total = es.reduce((sum, s) => sum + shiftDuration(s), 0);
      if (total > 35) w.push({ message: `${emp.name.split(" ")[0]} — ${total}h/sem (max 35h)` });
      const workDays = es.filter((s) => s.type !== "repos").map((s) => s.date).sort();
      let streak = 1;
      for (let i = 1; i < workDays.length; i++) {
        const diff = (new Date(workDays[i]).getTime() - new Date(workDays[i - 1]).getTime()) / 86400000;
        streak = diff === 1 ? streak + 1 : 1;
        if (streak >= 6) w.push({ message: `${emp.name.split(" ")[0]} — ${streak} jours consécutifs` });
      }
    });
    return w;
  }, [shifts]);

  // ─── Totaux par colonne (nb actifs / jour) ─────────────────────────────────

  const dayTotals = useMemo(
    () =>
      weekDays.map((day) => {
        const dateStr = toYMD(day);
        return shifts.filter((s) => s.date === dateStr && s.type !== "repos").length;
      }),
    [weekDays, shifts]
  );

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function saveShift(data: Omit<Shift, "id"> & { id?: string }) {
    const s: Shift = { ...data, id: data.id ?? crypto.randomUUID() };
    setShiftsMap((prev) => {
      const cur = prev[weekKey] ?? getShiftsForWeek(weekKey);
      return { ...prev, [weekKey]: [...cur.filter((x) => !(x.employeeId === s.employeeId && x.date === s.date)), s] };
    });
    if (publishedStatus === "publié") setStatus("modifié");
  }

  function deleteShift(id: string) {
    setShiftsMap((prev) => {
      const cur = prev[weekKey] ?? getShiftsForWeek(weekKey);
      return { ...prev, [weekKey]: cur.filter((s) => s.id !== id) };
    });
    if (publishedStatus === "publié") setStatus("modifié");
  }

  function publish() { setStatus("publié"); setPublished("publié"); }
  function toggleLock() { setStatus((s) => s === "verrouillé" ? (publishedStatus ?? "brouillon") : "verrouillé"); }
  function copyWeek() {
    const prev = shiftsMap[toYMD(addDays(weekStart, -7))] ?? getShiftsForWeek(toYMD(addDays(weekStart, -7)));
    const copied = prev.map((s) => ({ ...s, id: crypto.randomUUID(), date: toYMD(addDays(new Date(s.date + "T00:00:00"), 7)) }));
    setShiftsMap((m) => ({ ...m, [weekKey]: copied }));
    if (publishedStatus === "publié") setStatus("modifié");
  }

  const locked = status === "verrouillé";
  const sc = STATUS_CONFIG[status];
  const modalEmployee = modal ? employees.find((e) => e.id === modal.employeeId) : null;
  const modalShift    = modal ? shifts.find((s) => s.employeeId === modal.employeeId && s.date === modal.date) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">

      {/* ── Barre status ──────────────────────────────────────────────────── */}
      <div className="border-border bg-background z-20 flex flex-wrap items-center gap-2 border-b px-4 py-2 md:gap-3 md:px-6">
        {/* Statut */}
        <div className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", sc.color)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
          {sc.label}
        </div>

        {/* Navigation semaine — centré */}
        <div className="flex flex-1 items-center justify-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-40 text-center text-sm font-semibold">{weekLabel}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setWeekOffset(0)}>
            Auj.
          </Button>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={copyWeek} disabled={locked}>
            <Copy className="mr-1 h-3.5 w-3.5" />
            <span className="hidden sm:inline">Copier sem. préc.</span>
            <span className="sm:hidden">Copier</span>
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={toggleLock}>
            {locked ? <Unlock className="mr-1 h-3.5 w-3.5" /> : <Lock className="mr-1 h-3.5 w-3.5" />}
            {locked ? "Déverr." : "Verr."}
          </Button>
          {status !== "publié" ? (
            <Button size="sm" className="h-7 text-xs" onClick={publish} disabled={locked}>
              <Send className="mr-1 h-3.5 w-3.5" />
              {status === "modifié" ? "Notifier" : "Publier"}
            </Button>
          ) : (
            <span className="text-muted-foreground text-xs">✓ Publié</span>
          )}
        </div>
      </div>

      {/* ── Conflits ─────────────────────────────────────────────────────── */}
      {conflicts.length > 0 && (
        <div className="border-border flex flex-wrap gap-x-4 gap-y-1 border-b bg-amber-50 px-4 py-2">
          {conflicts.map((c, i) => (
            <span key={i} className="flex items-center gap-1 text-xs text-amber-800">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {c.message}
            </span>
          ))}
        </div>
      )}

      {/* ── Grille ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse" style={{ minWidth: "640px" }}>

          {/* En-tête jours */}
          <thead className="sticky top-0 z-20">
            <tr className="border-border bg-card border-b">
              {/* Colonne employé — cellule sticky */}
              <th className="border-border bg-card sticky left-0 z-30 w-44 border-r px-4 py-2.5 text-left md:w-52">
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Équipe · {employees.length} pers.
                </span>
              </th>

              {weekDays.map((day, i) => {
                const isToday   = toYMD(day) === todayYMD;
                const isWeekend = i >= 5;
                return (
                  <th
                    key={i}
                    className={cn(
                      "min-w-[108px] px-1 py-2 text-center",
                      isWeekend && "bg-muted/30",
                      isToday && "bg-primary/5"
                    )}
                  >
                    <p className={cn("text-[10px] font-semibold tracking-widest uppercase",
                      isToday ? "text-primary" : "text-muted-foreground"
                    )}>
                      {DAY_SHORT[i]}
                    </p>
                    <p className={cn(
                      "mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold",
                      isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                    )}>
                      {day.getDate()}
                    </p>
                    {/* nb actifs ce jour */}
                    <p className={cn("mt-0.5 text-[10px] font-medium",
                      isToday ? "text-primary" : "text-muted-foreground"
                    )}>
                      {dayTotals[i]}/{employees.length}
                    </p>
                  </th>
                );
              })}

              {/* Colonne total */}
              <th className="text-muted-foreground w-12 px-2 py-2 text-center text-[10px] font-medium tracking-wide uppercase">
                Total
              </th>
            </tr>
          </thead>

          <tbody className="divide-border divide-y">
            {employees.map((employee, rowIdx) => {
              const empShifts = shifts.filter((s) => s.employeeId === employee.id);
              const totalH    = empShifts.reduce((sum, s) => sum + shiftDuration(s), 0);

              return (
                <tr
                  key={employee.id}
                  className={cn(
                    "hover:bg-muted/10 group transition-colors",
                    rowIdx % 2 === 1 && "bg-muted/[0.03]"
                  )}
                >
                  {/* Employé — colonne sticky */}
                  <td className={cn(
                    "border-border sticky left-0 z-10 w-44 border-r px-4 py-2.5 md:w-52",
                    rowIdx % 2 === 1 ? "bg-muted/[0.03]" : "bg-background",
                    "group-hover:bg-muted/10 transition-colors"
                  )}>
                    <p className="truncate text-sm font-semibold">{employee.name}</p>
                    <span className={cn(
                      "mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                      ROLE_COLORS[employee.role]
                    )}>
                      {employee.role.replace("_", " ")}
                    </span>
                  </td>

                  {/* Cellules jours */}
                  {weekDays.map((day, i) => {
                    const dateStr  = toYMD(day);
                    const shift    = empShifts.find((s) => s.date === dateStr);
                    const cfg      = shift ? SHIFT_CONFIG[shift.type] : null;
                    const isWeekend = i >= 5;
                    const isToday   = dateStr === todayYMD;

                    return (
                      <td
                        key={i}
                        className={cn(
                          "px-1.5 py-1.5",
                          isWeekend && "bg-muted/[0.06]",
                          isToday && "bg-primary/[0.03]"
                        )}
                      >
                        {shift && shift.type !== "repos" ? (
                          <button
                            type="button"
                            onClick={() => setModal({ employeeId: employee.id, date: dateStr })}
                            className={cn(
                              "w-full rounded-lg border px-2 py-2 text-left transition-all",
                              "hover:opacity-90 hover:shadow-sm active:scale-[0.98]",
                              cfg?.className
                            )}
                          >
                            <p className="text-[11px] font-bold">{cfg?.label}</p>
                            <p className="text-[10px] font-medium opacity-70">
                              {shift.start}–{shift.end}
                            </p>
                          </button>
                        ) : shift?.type === "repos" ? (
                          <button
                            type="button"
                            onClick={() => setModal({ employeeId: employee.id, date: dateStr })}
                            className="text-muted-foreground/60 hover:text-muted-foreground w-full py-2 text-center text-xs transition-colors"
                          >
                            —
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => setModal({ employeeId: employee.id, date: dateStr })}
                            className={cn(
                              "group/cell flex w-full items-center justify-center rounded-lg py-[18px] transition-all",
                              locked
                                ? "cursor-not-allowed"
                                : "border border-dashed border-transparent hover:border-primary/20 hover:bg-primary/5"
                            )}
                          >
                            {!locked && (
                              <Plus className="text-muted-foreground/30 group-hover/cell:text-primary/50 h-3.5 w-3.5 transition-colors" />
                            )}
                          </button>
                        )}
                      </td>
                    );
                  })}

                  {/* Total heures */}
                  <td className="px-2 py-2 text-center">
                    <span className={cn(
                      "text-xs font-bold",
                      totalH > 35 ? "text-amber-500" : totalH === 0 ? "text-muted-foreground/40" : "text-foreground"
                    )}>
                      {totalH > 0 ? `${totalH}h` : "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Ligne totaux en bas */}
          <tfoot className="sticky bottom-0 z-20">
            <tr className="border-border bg-muted/40 border-t">
              <td className="border-border sticky left-0 z-30 border-r bg-muted/40 px-4 py-2">
                <span className="text-muted-foreground text-xs font-semibold">Total actifs</span>
              </td>
              {weekDays.map((day, i) => {
                const isWeekend = i >= 5;
                return (
                  <td key={i} className={cn("py-2 text-center", isWeekend && "bg-muted/30")}>
                    <span className="text-sm font-bold">{dayTotals[i]}</span>
                  </td>
                );
              })}
              <td className="py-2 text-center">
                <span className="text-muted-foreground text-xs">
                  {Math.round(shifts.reduce((a, s) => a + shiftDuration(s), 0))}h
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Légende ──────────────────────────────────────────────────────── */}
      <div className="border-border flex flex-wrap items-center gap-3 border-t px-4 py-2">
        {(Object.entries(SHIFT_CONFIG) as [ShiftType, typeof SHIFT_CONFIG[ShiftType]][]).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1">
            <span className={cn("h-2 w-2 rounded-sm border", cfg.className)} />
            <span className="text-muted-foreground text-[10px]">{cfg.label}</span>
          </div>
        ))}
        <span className="text-muted-foreground ml-auto hidden text-[10px] md:block">
          Tapez une cellule pour ajouter ou modifier un shift
        </span>
      </div>

      {/* ── Modal ────────────────────────────────────────────────────────── */}
      {modal && modalEmployee && (
        <ShiftModal
          open
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
