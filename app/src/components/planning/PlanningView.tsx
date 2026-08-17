"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Plus, AlertTriangle,
  Copy, Send, Lock, Unlock, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ShiftModal } from "@/components/planning/ShiftModal";
import { employees, getShiftsForWeek } from "@/lib/planning/mock-data";
import type { Shift, ShiftType, Employee, PlanningStatus } from "@/types/planning";
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

function parseMinutes(t: string) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function shiftDuration(s: Shift) {
  if (s.type === "repos" || !s.start || !s.end) return 0;
  return Math.max(0, (parseMinutes(s.end) - parseMinutes(s.start)) / 60);
}

const DAY_SHORT   = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_SHORT = ["jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"];

// ─── Config ──────────────────────────────────────────────────────────────────

type ServiceType = "matin" | "soir" | "coupure";

const SERVICE_ROWS: {
  type: ServiceType;
  label: string;
  hours: string;
  bg: string;       // cell background
  chip: string;     // employee chip
  header: string;   // left-col header
  dot: string;
}[] = [
  {
    type:   "matin",
    label:  "Matin",
    hours:  "07:00 – 15:00",
    bg:     "bg-blue-50/60",
    chip:   "bg-blue-100 text-blue-800 hover:bg-blue-200",
    header: "border-blue-200 bg-blue-50 text-blue-800",
    dot:    "bg-blue-400",
  },
  {
    type:   "soir",
    label:  "Soir",
    hours:  "15:00 – 23:00",
    bg:     "bg-violet-50/60",
    chip:   "bg-violet-100 text-violet-800 hover:bg-violet-200",
    header: "border-violet-200 bg-violet-50 text-violet-800",
    dot:    "bg-violet-400",
  },
  {
    type:   "coupure",
    label:  "Coupure",
    hours:  "10:00 – 23:00",
    bg:     "bg-amber-50/60",
    chip:   "bg-amber-100 text-amber-800 hover:bg-amber-200",
    header: "border-amber-200 bg-amber-50 text-amber-800",
    dot:    "bg-amber-400",
  },
];

const STATUS_CONFIG: Record<PlanningStatus, { label: string; color: string; dot: string }> = {
  brouillon:  { label: "Brouillon",  color: "text-amber-700   bg-amber-50   border-amber-200",   dot: "bg-amber-400"   },
  publié:     { label: "Publié",     color: "text-emerald-700 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  modifié:    { label: "Modifié",    color: "text-orange-700  bg-orange-50  border-orange-200",  dot: "bg-orange-400"  },
  verrouillé: { label: "Verrouillé", color: "text-slate-700   bg-slate-100  border-slate-200",   dot: "bg-slate-500"   },
};

const DEFAULT_TIMES: Record<ServiceType, { start: string; end: string }> = {
  matin:   { start: "07:00", end: "15:00" },
  soir:    { start: "15:00", end: "23:00" },
  coupure: { start: "10:00", end: "23:00" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PlanningView() {
  const [weekOffset, setWeekOffset]     = useState(0);
  const [shiftsMap, setShiftsMap]       = useState<Record<string, Shift[]>>({});
  const [status, setStatus]             = useState<PlanningStatus>("brouillon");
  const [publishedStatus, setPublished] = useState<PlanningStatus | null>(null);
  const [editModal, setEditModal]       = useState<{ employeeId: string; date: string } | null>(null);

  // ─── Dates ─────────────────────────────────────────────────────────────────

  const weekStart = addDays(getWeekStart(new Date()), weekOffset * 7);
  const weekKey   = toYMD(weekStart);
  const weekDays  = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd   = weekDays[6];
  const todayYMD  = toYMD(new Date());

  const sm = MONTH_SHORT[weekStart.getMonth()];
  const em = MONTH_SHORT[weekEnd.getMonth()];
  const weekLabel =
    sm === em
      ? `${weekStart.getDate()} – ${weekEnd.getDate()} ${em} ${weekEnd.getFullYear()}`
      : `${weekStart.getDate()} ${sm} – ${weekEnd.getDate()} ${em} ${weekEnd.getFullYear()}`;

  const shifts: Shift[] = useMemo(
    () => shiftsMap[weekKey] ?? getShiftsForWeek(weekKey),
    [shiftsMap, weekKey]
  );

  // ─── Grille services × jours ───────────────────────────────────────────────

  const grid = useMemo(() =>
    SERVICE_ROWS.map((svc) => ({
      ...svc,
      days: weekDays.map((day) => {
        const dateStr = toYMD(day);
        const working = employees.filter((emp) =>
          shifts.some((s) => s.employeeId === emp.id && s.date === dateStr && s.type === svc.type)
        );
        return { dateStr, working };
      }),
    })),
    [shifts, weekDays]
  );

  // Total actifs par jour (pour l'en-tête)
  const dayTotals = useMemo(() =>
    weekDays.map((day) => {
      const dateStr = toYMD(day);
      return shifts.filter((s) => s.date === dateStr && s.type !== "repos").length;
    }),
    [weekDays, shifts]
  );

  // Total heures hebdo par employé (pour conflits)
  const conflicts = useMemo(() => {
    const w: string[] = [];
    employees.forEach((emp) => {
      const es = shifts.filter((s) => s.employeeId === emp.id);
      const total = es.reduce((sum, s) => sum + shiftDuration(s), 0);
      if (total > 35)
        w.push(`${emp.name.split(" ")[0]} — ${total}h/sem (max 35h)`);
      const workDays = es.filter((s) => s.type !== "repos").map((s) => s.date).sort();
      let streak = 1;
      for (let i = 1; i < workDays.length; i++) {
        const diff = (new Date(workDays[i]).getTime() - new Date(workDays[i - 1]).getTime()) / 86400000;
        streak = diff === 1 ? streak + 1 : 1;
        if (streak >= 6)
          w.push(`${emp.name.split(" ")[0]} — ${streak} jours consécutifs`);
      }
    });
    return w;
  }, [shifts]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const markModified = () => { if (publishedStatus === "publié") setStatus("modifié"); };

  function quickAdd(emp: Employee, date: string, type: ServiceType) {
    const t = DEFAULT_TIMES[type];
    const newShift: Shift = {
      id: crypto.randomUUID(),
      employeeId: emp.id,
      date,
      type,
      start: t.start,
      end:   t.end,
    };
    setShiftsMap((prev) => {
      const cur = prev[weekKey] ?? getShiftsForWeek(weekKey);
      const without = cur.filter((s) => !(s.employeeId === emp.id && s.date === date));
      return { ...prev, [weekKey]: [...without, newShift] };
    });
    markModified();
  }

  function removeFromService(emp: Employee, date: string) {
    setShiftsMap((prev) => {
      const cur = prev[weekKey] ?? getShiftsForWeek(weekKey);
      return { ...prev, [weekKey]: cur.filter((s) => !(s.employeeId === emp.id && s.date === date)) };
    });
    markModified();
  }

  function saveShift(data: Omit<Shift, "id"> & { id?: string }) {
    const s: Shift = { ...data, id: data.id ?? crypto.randomUUID() };
    setShiftsMap((prev) => {
      const cur = prev[weekKey] ?? getShiftsForWeek(weekKey);
      return { ...prev, [weekKey]: [...cur.filter((x) => !(x.employeeId === s.employeeId && x.date === s.date)), s] };
    });
    markModified();
  }

  function deleteShift(id: string) {
    setShiftsMap((prev) => {
      const cur = prev[weekKey] ?? getShiftsForWeek(weekKey);
      return { ...prev, [weekKey]: cur.filter((s) => s.id !== id) };
    });
    markModified();
  }

  function publish()     { setStatus("publié"); setPublished("publié"); }
  function toggleLock()  { setStatus((s) => s === "verrouillé" ? (publishedStatus ?? "brouillon") : "verrouillé"); }
  function copyWeek() {
    const prev = shiftsMap[toYMD(addDays(weekStart, -7))] ?? getShiftsForWeek(toYMD(addDays(weekStart, -7)));
    const copied = prev.map((s) => ({
      ...s,
      id: crypto.randomUUID(),
      date: toYMD(addDays(new Date(s.date + "T00:00:00"), 7)),
    }));
    setShiftsMap((m) => ({ ...m, [weekKey]: copied }));
    markModified();
  }

  // ─── State dérivé ──────────────────────────────────────────────────────────

  const locked = status === "verrouillé";
  const sc = STATUS_CONFIG[status];
  const modalEmployee = editModal ? employees.find((e) => e.id === editModal.employeeId) : null;
  const modalShift    = editModal
    ? shifts.find((s) => s.employeeId === editModal.employeeId && s.date === editModal.date)
    : undefined;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-0 flex-1 flex-col">

      {/* ── Barre de statut ───────────────────────────────────────────────── */}
      <div className="border-border bg-background z-20 flex flex-wrap items-center gap-2 border-b px-4 py-2 md:px-6">
        <div className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", sc.color)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
          {sc.label}
        </div>

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
          {conflicts.map((msg, i) => (
            <span key={i} className="flex items-center gap-1 text-xs text-amber-800">
              <AlertTriangle className="h-3 w-3 shrink-0" /> {msg}
            </span>
          ))}
        </div>
      )}

      {/* ── Grille ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse" style={{ minWidth: "600px" }}>

          {/* En-tête jours */}
          <thead className="sticky top-0 z-20">
            <tr className="border-border bg-card border-b">
              {/* Colonne services — sticky */}
              <th className="border-border bg-card sticky left-0 z-30 w-36 border-r px-3 py-2 text-left md:w-44">
                <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                  Service
                </span>
              </th>
              {weekDays.map((day, i) => {
                const isToday   = toYMD(day) === todayYMD;
                const isWeekend = i >= 5;
                return (
                  <th key={i} className={cn(
                    "min-w-[120px] px-2 py-2 text-center md:min-w-[140px]",
                    isWeekend && "bg-muted/30",
                    isToday && "bg-primary/5"
                  )}>
                    <p className={cn("text-[10px] font-bold tracking-widest uppercase",
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
                    <p className={cn("mt-0.5 text-[10px] font-medium",
                      isToday ? "text-primary" : "text-muted-foreground"
                    )}>
                      {dayTotals[i]} actifs
                    </p>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-border divide-y">
            {grid.map((svc) => (
              <tr key={svc.type} className="align-top">

                {/* Colonne service — sticky */}
                <td className={cn(
                  "border-border sticky left-0 z-10 w-36 border-r px-3 py-3 md:w-44",
                  "bg-background"
                )}>
                  <div className={cn("rounded-lg border p-2.5", svc.header)}>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", svc.dot)} />
                      <p className="text-sm font-bold">{svc.label}</p>
                    </div>
                    <p className="mt-0.5 text-[10px] font-mono opacity-70">{svc.hours}</p>
                  </div>
                </td>

                {/* Cellule par jour */}
                {svc.days.map(({ dateStr, working }, dayIdx) => {
                  const isToday   = dateStr === todayYMD;
                  const isWeekend = dayIdx >= 5;

                  // Employés disponibles à ajouter (pas encore de shift ce jour-là)
                  const available = employees.filter((emp) => {
                    const existing = shifts.find((s) => s.employeeId === emp.id && s.date === dateStr);
                    return !existing || existing.type === "repos";
                  });

                  return (
                    <td key={dateStr} className={cn(
                      "px-2 py-2 align-top",
                      isWeekend && "bg-muted/[0.06]",
                      isToday && "bg-primary/[0.03]"
                    )}>
                      <div className="flex flex-col gap-1">
                        {/* Employés assignés */}
                        {working.map((emp) => (
                          <div
                            key={emp.id}
                            className={cn(
                              "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                              svc.chip
                            )}
                          >
                            {/* Initiale */}
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/60 text-[9px] font-bold">
                              {emp.name.charAt(0)}
                            </span>
                            {/* Prénom */}
                            <span className="min-w-0 flex-1 truncate">
                              {emp.name.split(" ")[0]}
                            </span>
                            {/* Supprimer */}
                            {!locked && (
                              <button
                                type="button"
                                onClick={() => removeFromService(emp, dateStr)}
                                className="ml-auto shrink-0 rounded opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-600"
                                title="Retirer"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                            {/* Modifier les horaires */}
                            {!locked && (
                              <button
                                type="button"
                                onClick={() => setEditModal({ employeeId: emp.id, date: dateStr })}
                                className="sr-only group-hover:not-sr-only"
                                title="Modifier les horaires"
                              />
                            )}
                          </div>
                        ))}

                        {/* Bouton ajouter */}
                        {!locked && available.length > 0 && (
                          <Popover>
                            <PopoverTrigger
                              className={cn(
                                "flex w-full items-center gap-1 rounded-lg border border-dashed px-2 py-1.5 text-xs transition-colors",
                                "border-current/20 text-current/40 hover:border-current/40 hover:text-current/70",
                                working.length === 0 && "border-muted-foreground/20 text-muted-foreground"
                              )}
                            >
                              <Plus className="h-3 w-3" />
                              <span>Ajouter</span>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-1" align="start">
                              <p className="text-muted-foreground mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide">
                                Ajouter au {svc.label}
                              </p>
                              {available.map((emp) => (
                                <button
                                  key={emp.id}
                                  type="button"
                                  onClick={() => quickAdd(emp, dateStr, svc.type)}
                                  className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
                                >
                                  <span className="bg-primary/10 text-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                                    {emp.name.charAt(0)}
                                  </span>
                                  {emp.name.split(" ")[0]}
                                  <span className="text-muted-foreground ml-auto text-[10px]">
                                    {emp.role.replace("_", " ")}
                                  </span>
                                </button>
                              ))}
                            </PopoverContent>
                          </Popover>
                        )}

                        {/* Aucun dispo */}
                        {!locked && available.length === 0 && working.length === 0 && (
                          <p className="text-muted-foreground/40 py-1 text-center text-[10px]">
                            Complet
                          </p>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Ligne totaux */}
            <tr className="border-border bg-muted/30 sticky bottom-0 z-20 border-t">
              <td className="border-border sticky left-0 z-30 border-r bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground text-xs font-semibold">Total actifs</span>
              </td>
              {weekDays.map((day, i) => {
                const isWeekend = i >= 5;
                const dateStr   = toYMD(day);
                const isToday   = dateStr === todayYMD;
                return (
                  <td key={i} className={cn(
                    "py-2 text-center text-sm font-bold",
                    isWeekend && "bg-muted/30",
                    isToday && "bg-primary/5"
                  )}>
                    {dayTotals[i] > 0 ? dayTotals[i] : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Légende ──────────────────────────────────────────────────────── */}
      <div className="border-border flex flex-wrap items-center gap-3 border-t px-4 py-2">
        {SERVICE_ROWS.map((svc) => (
          <div key={svc.type} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", svc.dot)} />
            <span className="text-muted-foreground text-xs">{svc.label} · {svc.hours}</span>
          </div>
        ))}
        {!locked && (
          <span className="text-muted-foreground ml-auto hidden text-[10px] md:block">
            Cliquez « Ajouter » pour affecter un employé · × pour retirer
          </span>
        )}
      </div>

      {/* ── Modal édition horaires ────────────────────────────────────────── */}
      {editModal && modalEmployee && (
        <ShiftModal
          open
          onClose={() => setEditModal(null)}
          onSave={saveShift}
          onDelete={deleteShift}
          employee={modalEmployee}
          date={editModal.date}
          existingShift={modalShift}
          locked={locked}
        />
      )}
    </div>
  );
}
