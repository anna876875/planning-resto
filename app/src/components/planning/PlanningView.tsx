"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Copy, Send, Lock, Unlock, X,
  AlertCircle, AlertTriangle, Clock, CalendarX, Zap, Users, Info,
  ChevronDown, ChevronUp,
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
  const d = new Date(date); d.setDate(d.getDate() + n); return d;
}
function toYMD(date: Date) { return date.toISOString().split("T")[0]; }
function parseMin(t: string) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function shiftDuration(s: Shift) {
  if (s.type === "repos" || !s.start || !s.end) return 0;
  return Math.max(0, (parseMin(s.end) - parseMin(s.start)) / 60);
}

const DAY_SHORT   = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const MONTH_SHORT = ["jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"];

// ─── Types d'erreurs / pictos ─────────────────────────────────────────────────

type ConflictLevel = "bloquant" | "avertissement" | "info";
type ConflictCode =
  | "heures_depassees"
  | "jours_consecutifs"
  | "repos_insuffisant"
  | "sous_effectif"
  | "non_publie";

interface Conflict {
  code:       ConflictCode;
  level:      ConflictLevel;
  message:    string;
  employeeId?: string;
  date?:       string;
}

// Catalogue visuel des types d'erreur — source de vérité pour la légende
export const CONFLICT_CATALOG: Record<ConflictCode, {
  label:      string;
  detail:     string;
  Icon:       React.ElementType;
  color:      string;   // text + bg pour la puce inline
  badge:      string;   // badge standalone
  border:     string;
}> = {
  heures_depassees: {
    label:  "Heures dépassées",
    detail: "L'employé dépasse le plafond légal cette semaine",
    Icon:   Clock,
    color:  "text-orange-600 bg-orange-50",
    badge:  "bg-orange-100 text-orange-700 border-orange-300",
    border: "border-orange-300",
  },
  jours_consecutifs: {
    label:  "Jours consécutifs",
    detail: "6 jours ou plus de travail d'affilée sans repos",
    Icon:   CalendarX,
    color:  "text-amber-600 bg-amber-50",
    badge:  "bg-amber-100 text-amber-700 border-amber-300",
    border: "border-amber-300",
  },
  repos_insuffisant: {
    label:  "Repos insuffisant",
    detail: "Moins de 11 h entre deux shifts consécutifs",
    Icon:   Zap,
    color:  "text-red-600 bg-red-50",
    badge:  "bg-red-100 text-red-700 border-red-300",
    border: "border-red-300",
  },
  sous_effectif: {
    label:  "Sous-effectif",
    detail: "Service en-dessous du minimum requis ce jour",
    Icon:   Users,
    color:  "text-red-600 bg-red-50",
    badge:  "bg-red-100 text-red-700 border-red-300",
    border: "border-red-300",
  },
  non_publie: {
    label:  "Non publié",
    detail: "Le planning est encore en brouillon",
    Icon:   Info,
    color:  "text-blue-600 bg-blue-50",
    badge:  "bg-blue-100 text-blue-700 border-blue-300",
    border: "border-blue-300",
  },
};

// ─── Légende pictos ───────────────────────────────────────────────────────────

function ConflictLegend() {
  const [open, setOpen] = useState(false);
  const bloquants     = (Object.entries(CONFLICT_CATALOG) as [ConflictCode, typeof CONFLICT_CATALOG[ConflictCode]][])
    .filter(([c]) => c === "repos_insuffisant" || c === "sous_effectif");
  const avertissements = (Object.entries(CONFLICT_CATALOG) as [ConflictCode, typeof CONFLICT_CATALOG[ConflictCode]][])
    .filter(([c]) => c === "heures_depassees" || c === "jours_consecutifs");
  const infos = (Object.entries(CONFLICT_CATALOG) as [ConflictCode, typeof CONFLICT_CATALOG[ConflictCode]][])
    .filter(([c]) => c === "non_publie");

  return (
    <div className="border-border border-t">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 px-4 py-2 text-xs font-medium transition-colors"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Légende des alertes
        {open
          ? <ChevronUp className="ml-auto h-3.5 w-3.5" />
          : <ChevronDown className="ml-auto h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="grid gap-4 px-4 pb-4 sm:grid-cols-3">
          {/* Bloquants */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-red-600 uppercase">
              <AlertCircle className="h-3.5 w-3.5" />
              Bloquant
            </p>
            <div className="space-y-2">
              {bloquants.map(([, cfg]) => (
                <div key={cfg.label} className={cn("flex items-start gap-2 rounded-lg border p-2", cfg.badge)}>
                  <cfg.Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">{cfg.label}</p>
                    <p className="text-[10px] opacity-80">{cfg.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Avertissements */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-amber-600 uppercase">
              <AlertTriangle className="h-3.5 w-3.5" />
              Avertissement
            </p>
            <div className="space-y-2">
              {avertissements.map(([, cfg]) => (
                <div key={cfg.label} className={cn("flex items-start gap-2 rounded-lg border p-2", cfg.badge)}>
                  <cfg.Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">{cfg.label}</p>
                    <p className="text-[10px] opacity-80">{cfg.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Infos */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-blue-600 uppercase">
              <Info className="h-3.5 w-3.5" />
              Information
            </p>
            <div className="space-y-2">
              {infos.map(([, cfg]) => (
                <div key={cfg.label} className={cn("flex items-start gap-2 rounded-lg border p-2", cfg.badge)}>
                  <cfg.Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">{cfg.label}</p>
                    <p className="text-[10px] opacity-80">{cfg.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Puce d'alerte inline ────────────────────────────────────────────────────

function ConflictBadge({ code }: { code: ConflictCode }) {
  const cfg = CONFLICT_CATALOG[code];
  return (
    <span
      title={`${cfg.label} — ${cfg.detail}`}
      className={cn("inline-flex items-center rounded-full p-0.5", cfg.color)}
    >
      <cfg.Icon className="h-3 w-3" />
    </span>
  );
}

// ─── Config services ──────────────────────────────────────────────────────────

type ServiceType = "matin" | "soir" | "coupure";

const SERVICE_ROWS: {
  type:   ServiceType;
  label:  string;
  hours:  string;
  bg:     string;
  chip:   string;
  header: string;
  dot:    string;
  min:    number;   // effectif minimum recommandé
}[] = [
  { type: "matin",   label: "Matin",   hours: "07:00 – 15:00", min: 2,
    bg: "bg-blue-50/60", chip: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    header: "border-blue-200 bg-blue-50 text-blue-800", dot: "bg-blue-400" },
  { type: "soir",    label: "Soir",    hours: "15:00 – 23:00", min: 2,
    bg: "bg-violet-50/60", chip: "bg-violet-100 text-violet-800 hover:bg-violet-200",
    header: "border-violet-200 bg-violet-50 text-violet-800", dot: "bg-violet-400" },
  { type: "coupure", label: "Coupure", hours: "10:00 – 23:00", min: 1,
    bg: "bg-amber-50/60", chip: "bg-amber-100 text-amber-800 hover:bg-amber-200",
    header: "border-amber-200 bg-amber-50 text-amber-800", dot: "bg-amber-400" },
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

// ─── Détection des conflits ───────────────────────────────────────────────────

function detectConflicts(shifts: Shift[], allWeekDays: Date[]): {
  all: Conflict[];
  byEmployee: Record<string, Conflict[]>;
  byDay: Record<string, Conflict[]>;
} {
  const all: Conflict[] = [];

  employees.forEach((emp) => {
    const es = shifts.filter((s) => s.employeeId === emp.id);
    const totalH = es.reduce((sum, s) => sum + shiftDuration(s), 0);

    // Heures dépassées
    if (totalH > 35) {
      all.push({
        code: "heures_depassees",
        level: "avertissement",
        message: `${emp.name.split(" ")[0]} — ${totalH}h cette semaine (max 35h)`,
        employeeId: emp.id,
      });
    }

    // Jours consécutifs
    const workDays = es.filter((s) => s.type !== "repos").map((s) => s.date).sort();
    let streak = 1;
    for (let i = 1; i < workDays.length; i++) {
      const diff = (new Date(workDays[i]).getTime() - new Date(workDays[i - 1]).getTime()) / 86400000;
      streak = diff === 1 ? streak + 1 : 1;
      if (streak >= 6) {
        all.push({
          code: "jours_consecutifs",
          level: "avertissement",
          message: `${emp.name.split(" ")[0]} — ${streak} jours consécutifs`,
          employeeId: emp.id,
          date: workDays[i],
        });
      }
    }

    // Repos insuffisant (< 11h entre deux shifts)
    const sorted = es
      .filter((s) => s.type !== "repos" && s.start && s.end)
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    for (let i = 1; i < sorted.length; i++) {
      const endPrev  = new Date(`${sorted[i - 1].date}T${sorted[i - 1].end}`);
      const startNext = new Date(`${sorted[i].date}T${sorted[i].start}`);
      const restH = (startNext.getTime() - endPrev.getTime()) / 3600000;
      if (restH >= 0 && restH < 11) {
        all.push({
          code: "repos_insuffisant",
          level: "bloquant",
          message: `${emp.name.split(" ")[0]} — ${Math.round(restH)}h de repos (min 11h)`,
          employeeId: emp.id,
          date: sorted[i].date,
        });
      }
    }
  });

  // Sous-effectif par service × jour
  allWeekDays.forEach((day) => {
    const dateStr = toYMD(day);
    SERVICE_ROWS.forEach((svc) => {
      const count = shifts.filter((s) => s.date === dateStr && s.type === svc.type).length;
      if (count > 0 && count < svc.min) {
        all.push({
          code: "sous_effectif",
          level: "bloquant",
          message: `${DAY_SHORT[allWeekDays.indexOf(day)]} — ${svc.label} : ${count}/${svc.min} min.`,
          date: dateStr,
        });
      }
    });
  });

  // Index par employé et par jour pour les indicateurs inline
  const byEmployee: Record<string, Conflict[]> = {};
  const byDay: Record<string, Conflict[]> = {};
  all.forEach((c) => {
    if (c.employeeId) {
      byEmployee[c.employeeId] = [...(byEmployee[c.employeeId] ?? []), c];
    }
    if (c.date) {
      byDay[c.date] = [...(byDay[c.date] ?? []), c];
    }
  });

  return { all, byEmployee, byDay };
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function PlanningView() {
  const [weekOffset, setWeekOffset]     = useState(0);
  const [shiftsMap, setShiftsMap]       = useState<Record<string, Shift[]>>({});
  const [status, setStatus]             = useState<PlanningStatus>("brouillon");
  const [publishedStatus, setPublished] = useState<PlanningStatus | null>(null);
  const [editModal, setEditModal]       = useState<{ employeeId: string; date: string } | null>(null);

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

  // Grille services × jours
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

  const dayTotals = useMemo(() =>
    weekDays.map((day) => {
      const d = toYMD(day);
      return shifts.filter((s) => s.date === d && s.type !== "repos").length;
    }),
    [weekDays, shifts]
  );

  // Conflits structurés
  const { all: allConflicts, byEmployee: conflictsByEmp, byDay: conflictsByDay } = useMemo(
    () => detectConflicts(shifts, weekDays),
    [shifts, weekDays]
  );

  const bloquants     = allConflicts.filter((c) => c.level === "bloquant");
  const avertissements = allConflicts.filter((c) => c.level === "avertissement");

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const markModified = () => { if (publishedStatus === "publié") setStatus("modifié"); };

  function quickAdd(emp: Employee, date: string, type: ServiceType) {
    const t = DEFAULT_TIMES[type];
    const s: Shift = { id: crypto.randomUUID(), employeeId: emp.id, date, type, ...t };
    setShiftsMap((prev) => {
      const cur = prev[weekKey] ?? getShiftsForWeek(weekKey);
      return { ...prev, [weekKey]: [...cur.filter((x) => !(x.employeeId === emp.id && x.date === date)), s] };
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

  function publish()    { setStatus("publié"); setPublished("publié"); }
  function toggleLock() { setStatus((s) => s === "verrouillé" ? (publishedStatus ?? "brouillon") : "verrouillé"); }
  function copyWeek() {
    const prevKey = toYMD(addDays(weekStart, -7));
    const prev = shiftsMap[prevKey] ?? getShiftsForWeek(prevKey);
    const copied = prev.map((s) => ({ ...s, id: crypto.randomUUID(), date: toYMD(addDays(new Date(s.date + "T00:00:00"), 7)) }));
    setShiftsMap((m) => ({ ...m, [weekKey]: copied }));
    markModified();
  }

  const locked = status === "verrouillé";
  const sc = STATUS_CONFIG[status];
  const modalEmployee = editModal ? employees.find((e) => e.id === editModal.employeeId) : null;
  const modalShift    = editModal ? shifts.find((s) => s.employeeId === editModal.employeeId && s.date === editModal.date) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">

      {/* ── Barre statut + actions ────────────────────────────────────────── */}
      <div className="border-border bg-background z-20 flex flex-wrap items-center gap-2 border-b px-4 py-2 md:px-6">
        <div className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", sc.color)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
          {sc.label}
        </div>

        {/* Compteurs erreurs */}
        {bloquants.length > 0 && (
          <span className="flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
            <AlertCircle className="h-3.5 w-3.5" />
            {bloquants.length} bloquant{bloquants.length > 1 ? "s" : ""}
          </span>
        )}
        {avertissements.length > 0 && (
          <span className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {avertissements.length} avertissement{avertissements.length > 1 ? "s" : ""}
          </span>
        )}

        {/* Navigation semaine */}
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
            <Button size="sm" className="h-7 text-xs" onClick={publish} disabled={locked || bloquants.length > 0}>
              <Send className="mr-1 h-3.5 w-3.5" />
              {status === "modifié" ? "Notifier" : "Publier"}
            </Button>
          ) : (
            <span className="text-muted-foreground text-xs">✓ Publié</span>
          )}
        </div>
      </div>

      {/* ── Bandeau conflits détaillés ────────────────────────────────────── */}
      {allConflicts.length > 0 && (
        <div className="border-border border-b px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {allConflicts.map((c, i) => {
              const cfg = CONFLICT_CATALOG[c.code];
              return (
                <span
                  key={i}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                    cfg.badge
                  )}
                >
                  <cfg.Icon className="h-3.5 w-3.5 shrink-0" />
                  {c.message}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Grille planning ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse" style={{ minWidth: "600px" }}>

          {/* En-tête jours */}
          <thead className="sticky top-0 z-20">
            <tr className="border-border bg-card border-b">
              <th className="border-border bg-card sticky left-0 z-30 w-36 border-r px-3 py-2 text-left md:w-44">
                <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">Service</span>
              </th>
              {weekDays.map((day, i) => {
                const isToday   = toYMD(day) === todayYMD;
                const isWeekend = i >= 5;
                const dateStr   = toYMD(day);
                const dayConflicts = conflictsByDay[dateStr] ?? [];
                const hasBloquant = dayConflicts.some((c) => c.level === "bloquant");
                const hasWarn     = dayConflicts.some((c) => c.level === "avertissement");
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
                    {/* Indicateur erreur sur le jour */}
                    {(hasBloquant || hasWarn) && (
                      <div className="mt-1 flex justify-center">
                        {hasBloquant
                          ? <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                          : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
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
                    <p className="mt-0.5 font-mono text-[10px] opacity-70">{svc.hours}</p>
                    <p className="mt-0.5 text-[10px] opacity-60">min. {svc.min} pers.</p>
                  </div>
                </td>

                {/* Cellules jours */}
                {svc.days.map(({ dateStr, working }, dayIdx) => {
                  const isToday   = dateStr === todayYMD;
                  const isWeekend = dayIdx >= 5;
                  const isSousEffectif = working.length > 0 && working.length < svc.min;

                  const available = employees.filter((emp) => {
                    const existing = shifts.find((s) => s.employeeId === emp.id && s.date === dateStr);
                    return !existing || existing.type === "repos";
                  });

                  return (
                    <td key={dateStr} className={cn(
                      "px-2 py-2 align-top",
                      isWeekend && "bg-muted/[0.06]",
                      isToday && "bg-primary/[0.03]",
                      isSousEffectif && "ring-1 ring-inset ring-red-200"
                    )}>
                      <div className="flex flex-col gap-1">
                        {working.map((emp) => {
                          const empConflicts = (conflictsByEmp[emp.id] ?? []).filter(
                            (c) => !c.date || c.date === dateStr
                          );
                          const worstLevel = empConflicts.some((c) => c.level === "bloquant")
                            ? "bloquant"
                            : empConflicts.some((c) => c.level === "avertissement")
                              ? "avertissement"
                              : null;

                          return (
                            <div key={emp.id} className={cn(
                              "group flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors",
                              svc.chip,
                              worstLevel === "bloquant" && "ring-1 ring-red-400",
                              worstLevel === "avertissement" && "ring-1 ring-amber-400"
                            )}>
                              {/* Initiale */}
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/60 text-[9px] font-bold">
                                {emp.name.charAt(0)}
                              </span>

                              {/* Nom + poste */}
                              <button
                                type="button"
                                disabled={locked}
                                onClick={() => !locked && setEditModal({ employeeId: emp.id, date: dateStr })}
                                className="min-w-0 flex-1 text-left disabled:cursor-default"
                              >
                                <p className="truncate text-xs font-semibold leading-tight">
                                  {emp.name.split(" ")[0]}
                                </p>
                                <p className="truncate text-[10px] font-normal leading-tight opacity-60">
                                  {emp.role.replace(/_/g, " ")}
                                </p>
                              </button>

                              {/* Pictos d'erreur inline */}
                              {empConflicts.length > 0 && (
                                <div className="flex shrink-0 gap-0.5">
                                  {[...new Set(empConflicts.map((c) => c.code))].map((code) => (
                                    <ConflictBadge key={code} code={code} />
                                  ))}
                                </div>
                              )}

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
                            </div>
                          );
                        })}

                        {/* Ajouter */}
                        {!locked && available.length > 0 && (
                          <Popover>
                            <PopoverTrigger className={cn(
                              "flex w-full items-center gap-1 rounded-lg border border-dashed px-2 py-1.5 text-xs transition-colors",
                              "border-current/20 text-current/40 hover:border-current/40 hover:text-current/70",
                              working.length === 0 && "border-muted-foreground/20 text-muted-foreground"
                            )}>
                              <Plus className="h-3 w-3" />
                              <span>Ajouter</span>
                            </PopoverTrigger>
                            <PopoverContent className="w-52 p-1" align="start">
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
                                  <span className="flex-1 truncate">{emp.name.split(" ")[0]}</span>
                                  <span className="text-muted-foreground text-[10px]">
                                    {emp.role.replace(/_/g, " ")}
                                  </span>
                                </button>
                              ))}
                            </PopoverContent>
                          </Popover>
                        )}

                        {!locked && available.length === 0 && working.length === 0 && (
                          <p className="text-muted-foreground/40 py-1 text-center text-[10px]">Complet</p>
                        )}

                        {/* Indicateur sous-effectif */}
                        {isSousEffectif && (
                          <div className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[10px] text-red-600">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            Sous-effectif ({working.length}/{svc.min} min.)
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Ligne totaux */}
            <tr className="border-border bg-muted/30 sticky bottom-0 z-20 border-t">
              <td className="border-border bg-muted/30 sticky left-0 z-30 border-r px-3 py-2">
                <span className="text-muted-foreground text-xs font-semibold">Total actifs</span>
              </td>
              {weekDays.map((day, i) => {
                const dateStr = toYMD(day);
                return (
                  <td key={i} className={cn(
                    "py-2 text-center text-sm font-bold",
                    i >= 5 && "bg-muted/30",
                    dateStr === todayYMD && "bg-primary/5"
                  )}>
                    {dayTotals[i] > 0 ? dayTotals[i] : <span className="text-muted-foreground/30">—</span>}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Légende dépliable ─────────────────────────────────────────────── */}
      <ConflictLegend />

      {/* ── Modal édition ────────────────────────────────────────────────── */}
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
