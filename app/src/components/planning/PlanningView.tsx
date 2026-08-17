"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Copy, Send, Lock, Unlock, X,
  AlertCircle, AlertTriangle, Clock, CalendarX, Zap, Users, Info,
  Pencil, Check, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ShiftModal } from "@/components/planning/ShiftModal";
import { employees, getShiftsForWeek } from "@/lib/planning/mock-data";
import type { Shift, ShiftType, Employee, PlanningStatus } from "@/types/planning";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekStart(d: Date) {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  r.setHours(0, 0, 0, 0);
  return r;
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function toYMD(d: Date) { return d.toISOString().split("T")[0]; }
function parseMin(t: string) { if (!t) return 0; const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function duration(s: Shift) {
  if (s.type === "repos" || !s.start || !s.end) return 0;
  return Math.max(0, (parseMin(s.end) - parseMin(s.start)) / 60);
}

const DAY_SHORT   = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const MONTH_SHORT = ["jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"];

// ─── Conflits ─────────────────────────────────────────────────────────────────

type ConflictCode = "heures_depassees" | "jours_consecutifs" | "repos_insuffisant" | "sous_effectif";

interface Conflict { code: ConflictCode; level: "bloquant" | "avertissement"; message: string; employeeId?: string; date?: string; }

const CONFLICT_META: Record<ConflictCode, { label: string; detail: string; Icon: React.ElementType; chip: string; dot: string }> = {
  heures_depassees:  { label: "Heures dépassées",  detail: "Plus de 35 h cette semaine",            Icon: Clock,     chip: "bg-orange-100 text-orange-700 border-orange-300", dot: "text-orange-500" },
  jours_consecutifs: { label: "Jours consécutifs", detail: "6 jours ou plus sans repos",            Icon: CalendarX, chip: "bg-amber-100  text-amber-700  border-amber-300",  dot: "text-amber-500"  },
  repos_insuffisant: { label: "Repos insuffisant", detail: "Moins de 11 h entre deux shifts",        Icon: Zap,       chip: "bg-red-100   text-red-700   border-red-300",   dot: "text-red-500"    },
  sous_effectif:     { label: "Sous-effectif",      detail: "En dessous du minimum requis ce jour", Icon: Users,     chip: "bg-red-100   text-red-700   border-red-300",   dot: "text-red-500"    },
};

function detect(shifts: Shift[], weekDays: Date[]): { all: Conflict[]; byEmp: Record<string, ConflictCode[]>; byDay: Record<string, boolean> } {
  const all: Conflict[] = [];
  employees.forEach((emp) => {
    const es  = shifts.filter((s) => s.employeeId === emp.id);
    const tot = es.reduce((a, s) => a + duration(s), 0);
    if (tot > 35) all.push({ code: "heures_depassees", level: "avertissement", message: `${emp.name.split(" ")[0]} — ${tot}h/sem`, employeeId: emp.id });
    const wd = es.filter((s) => s.type !== "repos").map((s) => s.date).sort();
    let streak = 1;
    for (let i = 1; i < wd.length; i++) {
      const diff = (new Date(wd[i]).getTime() - new Date(wd[i-1]).getTime()) / 86400000;
      streak = diff === 1 ? streak + 1 : 1;
      if (streak >= 6) all.push({ code: "jours_consecutifs", level: "avertissement", message: `${emp.name.split(" ")[0]} — ${streak}j consécutifs`, employeeId: emp.id, date: wd[i] });
    }
    const sorted = es.filter((s) => s.start && s.end && s.type !== "repos").sort((a, b) => (a.date+a.start).localeCompare(b.date+b.start));
    for (let i = 1; i < sorted.length; i++) {
      const rest = (new Date(`${sorted[i].date}T${sorted[i].start}`).getTime() - new Date(`${sorted[i-1].date}T${sorted[i-1].end}`).getTime()) / 3600000;
      if (rest >= 0 && rest < 11) all.push({ code: "repos_insuffisant", level: "bloquant", message: `${emp.name.split(" ")[0]} — ${Math.round(rest)}h repos`, employeeId: emp.id, date: sorted[i].date });
    }
  });
  SERVICE_ROWS.forEach((svc) => weekDays.forEach((day) => {
    const dateStr = toYMD(day);
    const count = shifts.filter((s) => s.date === dateStr && s.type === svc.type).length;
    if (count > 0 && count < svc.min) all.push({ code: "sous_effectif", level: "bloquant", message: `${DAY_SHORT[weekDays.indexOf(day)]} ${svc.label} — ${count}/${svc.min}`, date: dateStr });
  }));
  const byEmp: Record<string, ConflictCode[]> = {};
  const byDay: Record<string, boolean> = {};
  all.forEach((c) => {
    if (c.employeeId) byEmp[c.employeeId] = [...new Set([...(byEmp[c.employeeId] ?? []), c.code])];
    if (c.date) byDay[c.date] = true;
  });
  return { all, byEmp, byDay };
}

// ─── Légende ──────────────────────────────────────────────────────────────────

function Legend() {
  const [open, setOpen] = useState(false);
  const groups: { label: string; Icon: React.ElementType; color: string; items: ConflictCode[] }[] = [
    { label: "Bloquant",      Icon: AlertCircle,   color: "text-red-600",    items: ["repos_insuffisant", "sous_effectif"] },
    { label: "Avertissement", Icon: AlertTriangle, color: "text-amber-600",  items: ["heures_depassees", "jours_consecutifs"] },
  ];
  return (
    <div className="border-border border-t">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 px-4 py-2 text-xs font-medium transition-colors"
      >
        <Info className="h-3.5 w-3.5" />
        Légende des alertes
        {open ? <ChevronUp className="ml-auto h-3.5 w-3.5" /> : <ChevronDown className="ml-auto h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
          {groups.map((g) => (
            <div key={g.label}>
              <p className={cn("mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase", g.color)}>
                <g.Icon className="h-3.5 w-3.5" />
                {g.label}
              </p>
              <div className="space-y-1.5">
                {g.items.map((code) => {
                  const m = CONFLICT_META[code];
                  return (
                    <div key={code} className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-xs", m.chip)}>
                      <m.Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <div>
                        <p className="font-semibold">{m.label}</p>
                        <p className="opacity-75">{m.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Services ─────────────────────────────────────────────────────────────────

type ServiceType = "matin" | "soir" | "coupure";
const SERVICE_ROWS: { type: ServiceType; label: string; hours: string; chip: string; header: string; dot: string; min: number }[] = [
  { type: "matin",   label: "Matin",   hours: "07:00 – 15:00", min: 2, dot: "bg-blue-400",   chip: "bg-blue-50   text-blue-800 hover:bg-blue-100",   header: "border-blue-200   bg-blue-50   text-blue-800"   },
  { type: "soir",    label: "Soir",    hours: "15:00 – 23:00", min: 2, dot: "bg-violet-400", chip: "bg-violet-50 text-violet-800 hover:bg-violet-100", header: "border-violet-200 bg-violet-50 text-violet-800" },
  { type: "coupure", label: "Coupure", hours: "10:00 – 23:00", min: 1, dot: "bg-amber-400",  chip: "bg-amber-50  text-amber-800 hover:bg-amber-100",  header: "border-amber-200  bg-amber-50  text-amber-800"  },
];
const DEFAULT_TIMES: Record<ServiceType, { start: string; end: string }> = {
  matin:   { start: "07:00", end: "15:00" },
  soir:    { start: "15:00", end: "23:00" },
  coupure: { start: "10:00", end: "23:00" },
};
const STATUS_CFG: Record<PlanningStatus, { label: string; color: string; dot: string }> = {
  brouillon:  { label: "Brouillon",  color: "text-amber-700   bg-amber-50   border-amber-200",   dot: "bg-amber-400"   },
  publié:     { label: "Publié",     color: "text-emerald-700 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  modifié:    { label: "Modifié",    color: "text-orange-700  bg-orange-50  border-orange-200",  dot: "bg-orange-400"  },
  verrouillé: { label: "Verrouillé", color: "text-slate-700   bg-slate-100  border-slate-200",   dot: "bg-slate-500"   },
};

// ─── Composant ────────────────────────────────────────────────────────────────

export function PlanningView() {
  const [weekOffset, setWeekOffset]  = useState(0);
  const [shiftsMap, setShiftsMap]    = useState<Record<string, Shift[]>>({});
  const [status, setStatus]          = useState<PlanningStatus>("brouillon");
  const [published, setPublished]    = useState<PlanningStatus | null>(null);
  const [editing, setEditing]        = useState(false);
  const [editModal, setEditModal]    = useState<{ employeeId: string; date: string } | null>(null);

  const weekStart = addDays(getWeekStart(new Date()), weekOffset * 7);
  const weekKey   = toYMD(weekStart);
  const weekDays  = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd   = weekDays[6];
  const todayYMD  = toYMD(new Date());

  const sm = MONTH_SHORT[weekStart.getMonth()];
  const em = MONTH_SHORT[weekEnd.getMonth()];
  const weekLabel = sm === em
    ? `${weekStart.getDate()} – ${weekEnd.getDate()} ${em} ${weekEnd.getFullYear()}`
    : `${weekStart.getDate()} ${sm} – ${weekEnd.getDate()} ${em} ${weekEnd.getFullYear()}`;

  const shifts: Shift[] = useMemo(
    () => shiftsMap[weekKey] ?? getShiftsForWeek(weekKey),
    [shiftsMap, weekKey]
  );

  const grid = useMemo(() =>
    SERVICE_ROWS.map((svc) => ({
      ...svc,
      days: weekDays.map((day) => {
        const dateStr = toYMD(day);
        return {
          dateStr,
          working: employees.filter((emp) => shifts.some((s) => s.employeeId === emp.id && s.date === dateStr && s.type === svc.type)),
        };
      }),
    })),
    [shifts, weekDays]
  );

  const dayTotals = useMemo(() =>
    weekDays.map((day) => shifts.filter((s) => s.date === toYMD(day) && s.type !== "repos").length),
    [weekDays, shifts]
  );

  const { all: allConflicts, byEmp, byDay } = useMemo(
    () => detect(shifts, weekDays),
    [shifts, weekDays]
  );
  const bloquants = allConflicts.filter((c) => c.level === "bloquant").length;
  const avertis   = allConflicts.filter((c) => c.level === "avertissement").length;
  const locked    = status === "verrouillé";

  // ─── Handlers ────────────────────────────────────────────────────────────

  const markModified = () => { if (published === "publié") setStatus("modifié"); };

  function quickAdd(emp: Employee, date: string, type: ServiceType) {
    const t = DEFAULT_TIMES[type];
    const s: Shift = { id: crypto.randomUUID(), employeeId: emp.id, date, type, ...t };
    setShiftsMap((prev) => {
      const cur = prev[weekKey] ?? getShiftsForWeek(weekKey);
      return { ...prev, [weekKey]: [...cur.filter((x) => !(x.employeeId === emp.id && x.date === date)), s] };
    });
    markModified();
  }

  function removeEmp(emp: Employee, date: string) {
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

  function publish()    { setStatus("publié"); setPublished("publié"); }
  function toggleLock() { setStatus((s) => s === "verrouillé" ? (published ?? "brouillon") : "verrouillé"); }
  function copyWeek() {
    const prevKey = toYMD(addDays(weekStart, -7));
    const prev = shiftsMap[prevKey] ?? getShiftsForWeek(prevKey);
    setShiftsMap((m) => ({ ...m, [weekKey]: prev.map((s) => ({ ...s, id: crypto.randomUUID(), date: toYMD(addDays(new Date(s.date + "T00:00:00"), 7)) })) }));
    markModified();
  }

  const sc = STATUS_CFG[status];
  const modalEmployee = editModal ? employees.find((e) => e.id === editModal.employeeId) : null;
  const modalShift    = editModal ? shifts.find((s) => s.employeeId === editModal.employeeId && s.date === editModal.date) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">

      {/* ── Barre principale ─────────────────────────────────────────────── */}
      <div className="border-border bg-background z-20 flex flex-wrap items-center gap-2 border-b px-4 py-2.5 md:px-6">

        {/* Statut */}
        <div className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", sc.color)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
          {sc.label}
        </div>

        {/* Alertes — compteurs compacts */}
        {bloquants > 0 && (
          <span className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
            <AlertCircle className="h-3 w-3" />{bloquants}
          </span>
        )}
        {avertis > 0 && (
          <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            <AlertTriangle className="h-3 w-3" />{avertis}
          </span>
        )}

        {/* Navigation semaine — centre */}
        <div className="flex flex-1 items-center justify-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-44 text-center text-sm font-semibold">{weekLabel}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setWeekOffset(0)}>
            Auj.
          </Button>
        </div>

        {/* Actions — droite */}
        <div className="flex shrink-0 items-center gap-2">
          {!editing ? (
            /* Mode lecture */
            <>
              {!locked && (
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Éditer
                </Button>
              )}
              {status !== "publié" && (
                <Button size="sm" className="h-8" onClick={publish} disabled={locked || bloquants > 0}>
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  {status === "modifié" ? "Notifier" : "Publier"}
                </Button>
              )}
            </>
          ) : (
            /* Mode édition */
            <>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={copyWeek}>
                <Copy className="mr-1 h-3.5 w-3.5" />
                Copier sem.
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={toggleLock}>
                {locked ? <Unlock className="mr-1 h-3.5 w-3.5" /> : <Lock className="mr-1 h-3.5 w-3.5" />}
                {locked ? "Déverr." : "Verr."}
              </Button>
              <Button size="sm" className="h-8 gap-1.5" onClick={() => setEditing(false)}>
                <Check className="h-3.5 w-3.5" />
                Terminer
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Bandeau édition ───────────────────────────────────────────────── */}
      {editing && (
        <div className="border-border border-b bg-blue-50 px-4 py-2 text-xs text-blue-700">
          <Pencil className="mr-1.5 inline h-3.5 w-3.5" />
          Mode édition — cliquez sur un employé pour modifier ses horaires, ou utilisez les cellules pour ajouter / retirer.
        </div>
      )}

      {/* ── Conflits détaillés ────────────────────────────────────────────── */}
      {allConflicts.length > 0 && (
        <div className="border-border flex flex-wrap gap-1.5 border-b px-4 py-2">
          {allConflicts.map((c, i) => {
            const m = CONFLICT_META[c.code];
            return (
              <span key={i} className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs", m.chip)}>
                <m.Icon className="h-3 w-3 shrink-0" />
                {c.message}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Grille ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse" style={{ minWidth: "580px" }}>

          <thead className="sticky top-0 z-20">
            <tr className="border-border bg-card border-b">
              <th className="border-border bg-card sticky left-0 z-30 w-36 border-r px-3 py-2.5 text-left md:w-44">
                <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">Service</span>
              </th>
              {weekDays.map((day, i) => {
                const isToday   = toYMD(day) === todayYMD;
                const isWeekend = i >= 5;
                const dateStr   = toYMD(day);
                return (
                  <th key={i} className={cn(
                    "min-w-[110px] px-2 py-2 text-center",
                    isWeekend && "bg-muted/20",
                    isToday && "bg-primary/5"
                  )}>
                    <p className={cn("text-[10px] font-bold tracking-widest uppercase",
                      isToday ? "text-primary" : "text-muted-foreground"
                    )}>{DAY_SHORT[i]}</p>
                    <p className={cn(
                      "mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold",
                      isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                    )}>{day.getDate()}</p>
                    <p className={cn("mt-0.5 text-[10px]", isToday ? "text-primary font-medium" : "text-muted-foreground")}>
                      {dayTotals[i]} actifs
                    </p>
                    {byDay[dateStr] && (
                      <div className="mt-0.5 flex justify-center">
                        <AlertCircle className="h-3 w-3 text-red-400" />
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-border divide-y">
            {grid.map((svc) => (
              <tr key={svc.type} className="align-top">
                {/* Colonne service sticky */}
                <td className="border-border bg-background sticky left-0 z-10 w-36 border-r px-3 py-3 md:w-44">
                  <div className={cn("rounded-lg border p-2.5", svc.header)}>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", svc.dot)} />
                      <p className="text-sm font-bold">{svc.label}</p>
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] opacity-60">{svc.hours}</p>
                  </div>
                </td>

                {svc.days.map(({ dateStr, working }, dayIdx) => {
                  const isToday   = dateStr === todayYMD;
                  const isWeekend = dayIdx >= 5;
                  const available = employees.filter((emp) => {
                    const existing = shifts.find((s) => s.employeeId === emp.id && s.date === dateStr);
                    return !existing || existing.type === "repos";
                  });

                  return (
                    <td key={dateStr} className={cn(
                      "px-2 py-2 align-top",
                      isWeekend && "bg-muted/[0.05]",
                      isToday && "bg-primary/[0.02]"
                    )}>
                      <div className="flex flex-col gap-1">
                        {/* Chips employés */}
                        {working.map((emp) => {
                          const codes = byEmp[emp.id] ?? [];
                          const hasBloquant = codes.some((c) => CONFLICT_META[c].chip.includes("red"));
                          const hasWarn     = codes.some((c) => CONFLICT_META[c].chip.includes("amber") || CONFLICT_META[c].chip.includes("orange"));

                          return (
                            <div key={emp.id} className={cn(
                              "group flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors",
                              svc.chip,
                              editing && "cursor-pointer",
                              (hasBloquant) && "ring-1 ring-red-300",
                              (!hasBloquant && hasWarn) && "ring-1 ring-amber-300"
                            )}>
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/70 text-[9px] font-bold">
                                {emp.name.charAt(0)}
                              </span>

                              {/* Nom + poste — cliquable uniquement en mode édition */}
                              {editing ? (
                                <button
                                  type="button"
                                  onClick={() => setEditModal({ employeeId: emp.id, date: dateStr })}
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <p className="truncate text-xs font-semibold leading-tight">{emp.name.split(" ")[0]}</p>
                                  <p className="truncate text-[10px] leading-tight opacity-60">{emp.role.replace(/_/g, " ")}</p>
                                </button>
                              ) : (
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-semibold leading-tight">{emp.name.split(" ")[0]}</p>
                                  <p className="truncate text-[10px] leading-tight opacity-60">{emp.role.replace(/_/g, " ")}</p>
                                </div>
                              )}

                              {/* Icônes d'alerte */}
                              {codes.length > 0 && (
                                <div className="flex shrink-0 gap-0.5">
                                  {[...new Set(codes)].map((code) => {
                                    const m = CONFLICT_META[code];
                                    return <m.Icon key={code} className={cn("h-3 w-3", m.dot)} title={m.label} />;
                                  })}
                                </div>
                              )}

                              {/* Retirer — uniquement en édition */}
                              {editing && (
                                <button
                                  type="button"
                                  onClick={() => removeEmp(emp, dateStr)}
                                  className="ml-auto shrink-0 rounded opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100 hover:text-red-600"
                                  title="Retirer"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}

                        {/* Bouton ajouter — uniquement en édition */}
                        {editing && available.length > 0 && (
                          <Popover>
                            <PopoverTrigger className="flex w-full items-center gap-1 rounded-lg border border-dashed border-current/20 px-2 py-1 text-[11px] text-current/40 transition-colors hover:border-current/40 hover:text-current/70">
                              <Plus className="h-3 w-3" />
                              Ajouter
                            </PopoverTrigger>
                            <PopoverContent className="w-52 p-1" align="start">
                              <p className="text-muted-foreground mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide">
                                {svc.label}
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
                                  <span className="flex-1 truncate text-sm">{emp.name.split(" ")[0]}</span>
                                  <span className="text-muted-foreground text-[10px]">{emp.role.replace(/_/g, " ")}</span>
                                </button>
                              ))}
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Ligne totaux sticky */}
            <tr className="border-border bg-muted/20 sticky bottom-0 z-20 border-t">
              <td className="border-border bg-muted/20 sticky left-0 z-30 border-r px-3 py-2">
                <span className="text-muted-foreground text-xs font-semibold">Total</span>
              </td>
              {weekDays.map((day, i) => {
                const isToday = toYMD(day) === todayYMD;
                return (
                  <td key={i} className={cn(
                    "py-2 text-center text-sm font-bold",
                    i >= 5 && "bg-muted/20",
                    isToday && "bg-primary/5"
                  )}>
                    {dayTotals[i] || <span className="text-muted-foreground/30 text-xs">—</span>}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Légende dépliable ─────────────────────────────────────────────── */}
      <Legend />

      {/* ── Modal horaires ────────────────────────────────────────────────── */}
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
