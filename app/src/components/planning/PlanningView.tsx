"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Plus, Copy, Send, Lock, Unlock, X,
  AlertCircle, AlertTriangle, Clock, CalendarX, Zap, Users,
  Pencil, Check, Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ShiftModal } from "@/components/planning/ShiftModal";
import { employees, getShiftsForWeek } from "@/lib/planning/mock-data";
import type { Shift, ShiftType, Employee, PlanningStatus } from "@/types/planning";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekStart(d: Date) {
  const r = new Date(d); const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1)); r.setHours(0, 0, 0, 0); return r;
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function parseMin(t: string) { if (!t) return 0; const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function duration(s: Shift) {
  if (s.type === "repos" || !s.start || !s.end) return 0;
  return Math.max(0, (parseMin(s.end) - parseMin(s.start)) / 60);
}

const DAY_SHORT   = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const DAY_LONG    = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
const MONTH_SHORT = ["jan","fév","mar","avr","mai","juin","juil","août","sep","oct","nov","déc"];

const DEPARTMENTS = [
  { label: "Cuisine", roles: ["chef_cuisine","chef_partie"], bg: "bg-orange-100/80", text: "text-orange-700" },
  { label: "Salle",   roles: ["serveur"],                    bg: "bg-blue-100/80",   text: "text-blue-700"  },
  { label: "Bar",     roles: ["barman"],                     bg: "bg-violet-100/80", text: "text-violet-700"},
  { label: "Plonge",  roles: ["plongeur"],                   bg: "bg-slate-100/80",  text: "text-slate-500" },
];

// ─── Infobulle simple ─────────────────────────────────────────────────────────

function Tip({ content, children }: { content: string; children: React.ReactNode }) {
  const lines = content.split("\n");
  return (
    <span className="group/tip relative">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden w-max max-w-56 -translate-x-1/2 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-[11px] leading-snug text-popover-foreground shadow-md group-hover/tip:block">
        {lines.map((line, i) => (
          <span key={i} className="block">{line}</span>
        ))}
      </span>
    </span>
  );
}

// ─── Conflits ─────────────────────────────────────────────────────────────────

type ConflictCode = "heures_depassees" | "jours_consecutifs" | "repos_insuffisant" | "sous_effectif";
interface Conflict { code: ConflictCode; level: "bloquant" | "avertissement"; message: string; employeeId?: string; date?: string; }

const CONFLICT_META: Record<ConflictCode, { label: string; detail: string; Icon: React.ElementType; iconColor: string; chip: string }> = {
  heures_depassees:  { label: "Heures dépassées",  detail: "Plus de 35 h cette semaine",          Icon: Clock,     iconColor: "text-orange-500", chip: "bg-orange-100 text-orange-700 border-orange-300" },
  jours_consecutifs: { label: "Jours consécutifs", detail: "6 jours ou plus sans repos",          Icon: CalendarX, iconColor: "text-amber-500",  chip: "bg-amber-100  text-amber-700  border-amber-300"  },
  repos_insuffisant: { label: "Repos insuffisant", detail: "Moins de 11 h entre deux shifts",      Icon: Zap,       iconColor: "text-red-500",    chip: "bg-red-100   text-red-700   border-red-300"   },
  sous_effectif:     { label: "Sous-effectif",      detail: "En dessous du minimum requis ce jour",Icon: Users,     iconColor: "text-red-500",    chip: "bg-red-100   text-red-700   border-red-300"   },
};

function detect(shifts: Shift[], weekDays: Date[]) {
  const all: Conflict[] = [];

  employees.forEach((emp) => {
    const es  = shifts.filter((s) => s.employeeId === emp.id);
    const tot = es.reduce((a, s) => a + duration(s), 0);
    if (tot > 35) all.push({ code: "heures_depassees", level: "avertissement", message: `${emp.name.split(" ")[0]} — ${tot}h cette semaine (max 35h)`, employeeId: emp.id });

    const wd = es.filter((s) => s.type !== "repos").map((s) => s.date).sort();
    let streak = 1;
    for (let i = 1; i < wd.length; i++) {
      const diff = (new Date(wd[i]).getTime() - new Date(wd[i-1]).getTime()) / 86400000;
      streak = diff === 1 ? streak + 1 : 1;
      if (streak >= 6) all.push({ code: "jours_consecutifs", level: "avertissement", message: `${emp.name.split(" ")[0]} — ${streak} jours d'affilée`, employeeId: emp.id, date: wd[i] });
    }

    const sorted = es.filter((s) => s.start && s.end && s.type !== "repos").sort((a, b) => (a.date+a.start).localeCompare(b.date+b.start));
    for (let i = 1; i < sorted.length; i++) {
      const rest = (new Date(`${sorted[i].date}T${sorted[i].start}`).getTime() - new Date(`${sorted[i-1].date}T${sorted[i-1].end}`).getTime()) / 3600000;
      if (rest >= 0 && rest < 11) all.push({ code: "repos_insuffisant", level: "bloquant", message: `${emp.name.split(" ")[0]} — seulement ${Math.round(rest)}h de repos`, employeeId: emp.id, date: sorted[i].date });
    }
  });

  SERVICE_ROWS.forEach((svc) => weekDays.forEach((day) => {
    const dateStr = toYMD(day);
    const count = shifts.filter((s) => s.date === dateStr && s.type === svc.type).length;
    if (count > 0 && count < svc.min)
      all.push({ code: "sous_effectif", level: "bloquant", message: `${DAY_SHORT[weekDays.indexOf(day)]} ${svc.label} — ${count} pers. (min. ${svc.min})`, date: dateStr });
  }));

  // Index : par employé → code → message (pour infobulles)
  const byEmpMsg: Record<string, Partial<Record<ConflictCode, string>>> = {};
  // Index : par jour → présence d'alerte
  const byDay: Record<string, boolean> = {};

  all.forEach((c) => {
    if (c.employeeId) {
      byEmpMsg[c.employeeId] = byEmpMsg[c.employeeId] ?? {};
      byEmpMsg[c.employeeId][c.code] = c.message;
    }
    if (c.date) byDay[c.date] = true;
  });

  return { all, byEmpMsg, byDay };
}

// ─── Critères de génération ───────────────────────────────────────────────────

const HORAIRES = [
  { jours: "Lun – Ven", plage: "07:00 – 23:00", services: "Matin · Soir"          },
  { jours: "Samedi",    plage: "10:00 – 23:00", services: "Matin · Coupure"        },
  { jours: "Dimanche",  plage: "Fermé",          services: "—"                     },
];

const EFFECTIFS = [
  { label: "Matin",   dot: "bg-blue-400",   text: "text-blue-800",   heures: "07:00 – 15:00", min: 2 },
  { label: "Coupure", dot: "bg-amber-400",  text: "text-amber-800",  heures: "10:00 – 23:00", min: 1 },
  { label: "Soir",    dot: "bg-violet-400", text: "text-violet-800", heures: "15:00 – 23:00", min: 2 },
];

const AFFLUENCE = [
  { jours: "Vendredi soir", niveau: "Élevé",     couleur: "text-orange-600 bg-orange-50 border-orange-200", note: "+1 pers. recommandé" },
  { jours: "Samedi",        niveau: "Très élevé", couleur: "text-red-600    bg-red-50    border-red-200",    note: "+2 pers. recommandé" },
  { jours: "Dimanche",      niveau: "Fermé",      couleur: "text-slate-500  bg-slate-50  border-slate-200",  note: "Repos équipe"         },
];

const CONTRAINTES = [
  { label: "Durée hebdomadaire max",    valeur: "35 h / semaine" },
  { label: "Repos minimum entre shifts", valeur: "11 h"           },
  { label: "Jours consécutifs max",     valeur: "5 jours"        },
];

// ─── Services ─────────────────────────────────────────────────────────────────

type ServiceType = "matin" | "soir" | "coupure";
const SERVICE_ROWS: { type: ServiceType; label: string; hours: string; chip: string; header: string; dot: string; text: string; min: number }[] = [
  { type: "matin",   label: "Matin",   hours: "07:00 – 15:00", min: 2, dot: "bg-blue-400",   chip: "bg-blue-50   text-blue-800",   header: "border-blue-200   bg-blue-50   text-blue-800",   text: "text-blue-800"   },
  { type: "coupure", label: "Coupure", hours: "10:00 – 23:00", min: 1, dot: "bg-amber-400",  chip: "bg-amber-50  text-amber-800",  header: "border-amber-200  bg-amber-50  text-amber-800",  text: "text-amber-800"  },
  { type: "soir",    label: "Soir",    hours: "15:00 – 23:00", min: 2, dot: "bg-violet-400", chip: "bg-violet-50 text-violet-800", header: "border-violet-200 bg-violet-50 text-violet-800", text: "text-violet-800" },
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

export function PlanningView({ onPublished, hideTabs = false, hideNav = false, hideStatus = false, hideAlerts = false, readOnly = false, showNames = false }: {
  onPublished?: (count: number) => void;
  hideTabs?: boolean;
  hideNav?: boolean;
  hideStatus?: boolean;
  hideAlerts?: boolean;
  readOnly?: boolean;
  showNames?: boolean;
} = {}) {
  const [activeTab, setActiveTab]   = useState<"planning" | "criteres">("planning");
  const [viewMode, setViewMode]     = useState<"semaine" | "jour">("semaine");
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayOffset,  setDayOffset]  = useState(0);
  const [shiftsMap, setShiftsMap]   = useState<Record<string, Shift[]>>({});
  const [status, setStatus]         = useState<PlanningStatus>("brouillon");
  const [published, setPublished]   = useState<PlanningStatus | null>(null);
  const [editing, setEditing]       = useState(false);
  const [editModal, setEditModal]   = useState<{ employeeId: string; date: string } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [selected, setSelected]   = useState<Set<string>>(
    () => new Set(employees.map((e) => e.id))
  );

  const weekStart = useMemo(() => addDays(getWeekStart(new Date()), weekOffset * 7), [weekOffset]);
  const selectedDay     = useMemo(() => addDays(new Date(), dayOffset), [dayOffset]);
  const selectedDayYMD  = toYMD(selectedDay);
  const selectedDayLabel = `${DAY_LONG[selectedDay.getDay()]} ${selectedDay.getDate()} ${MONTH_SHORT[selectedDay.getMonth()]}`;
  const selectedWeekKey = useMemo(() => toYMD(getWeekStart(selectedDay)), [selectedDay]);
  const weekKey   = toYMD(weekStart);
  const weekDays  = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd   = weekDays[6];
  const todayYMD  = toYMD(new Date());

  const sm = MONTH_SHORT[weekStart.getMonth()];
  const em = MONTH_SHORT[weekEnd.getMonth()];
  const weekLabel = sm === em
    ? `${weekStart.getDate()} – ${weekEnd.getDate()} ${em} ${weekEnd.getFullYear()}`
    : `${weekStart.getDate()} ${sm} – ${weekEnd.getDate()} ${em} ${weekEnd.getFullYear()}`;

  const shifts: Shift[] = useMemo(() => shiftsMap[weekKey] ?? getShiftsForWeek(weekKey), [shiftsMap, weekKey]);
  const selectedDayShifts = useMemo(() => {
    const w = shiftsMap[selectedWeekKey] ?? getShiftsForWeek(selectedWeekKey);
    return w.filter(s => s.date === selectedDayYMD);
  }, [shiftsMap, selectedWeekKey, selectedDayYMD]);
  const { all: allConflicts, byEmpMsg, byDay } = useMemo(() => detect(shifts, weekDays), [shifts, weekDays]);

  const grid = useMemo(() =>
    SERVICE_ROWS.map((svc) => ({
      ...svc,
      days: weekDays.map((day) => {
        const dateStr = toYMD(day);
        return { dateStr, working: employees.filter((emp) => shifts.some((s) => s.employeeId === emp.id && s.date === dateStr && s.type === svc.type)) };
      }),
    })), [shifts, weekDays]);

  const bloquants = allConflicts.filter((c) => c.level === "bloquant");
  const avertis   = allConflicts.filter((c) => c.level === "avertissement");
  const locked    = status === "verrouillé";

  const sc        = STATUS_CFG[status];

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
  function handleShare() { setShareOpen(false); publish(); onPublished?.(selected.size); }
  function toEmail(name: string) {
    return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, ".") + "@restaurant.fr";
  }
  function toggleRecipient(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleLock() { setStatus((s) => s === "verrouillé" ? (published ?? "brouillon") : "verrouillé"); }
  function copyWeek() {
    const prevKey = toYMD(addDays(weekStart, -7));
    const prev = shiftsMap[prevKey] ?? getShiftsForWeek(prevKey);
    setShiftsMap((m) => ({ ...m, [weekKey]: prev.map((s) => ({ ...s, id: crypto.randomUUID(), date: toYMD(addDays(new Date(s.date + "T00:00:00"), 7)) })) }));
    markModified();
  }

  const modalEmployee = editModal ? employees.find((e) => e.id === editModal.employeeId) : null;
  const modalShift    = editModal ? shifts.find((s) => s.employeeId === editModal.employeeId && s.date === editModal.date) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

      {/* ── Barre principale ─────────────────────────────────────────────── */}
      <div className="border-border bg-background z-20 flex flex-wrap items-center gap-2 border-b px-4 py-2.5 md:px-6">
        {/* Statut */}
        {!hideStatus && (
          <div className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", sc.color)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
            {sc.label}
          </div>
        )}

        {/* Navigation + toggle vue */}
        {!hideNav ? (
          <div className="flex flex-1 items-center justify-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => viewMode === "semaine" ? setWeekOffset(w => w - 1) : setDayOffset(d => d - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-44 text-center text-sm font-semibold">
              {viewMode === "semaine" ? weekLabel : selectedDayLabel}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => viewMode === "semaine" ? setWeekOffset(w => w + 1) : setDayOffset(d => d + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs"
              onClick={() => viewMode === "semaine" ? setWeekOffset(0) : setDayOffset(0)}>
              Auj.
            </Button>
            <div className="ml-2 flex overflow-hidden rounded-md border border-border">
              {(["semaine", "jour"] as const).map(mode => (
                <button key={mode} type="button" onClick={() => setViewMode(mode)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-medium transition-colors",
                    viewMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  )}>
                  {mode === "semaine" ? "Sem." : "Jour"}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* CTA droite */}
        <div className="flex shrink-0 items-center gap-2">
          {readOnly ? (
            <>
              <Link href="/dashboard/plannings/actif" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                <Pencil className="h-3.5 w-3.5" /> Modifier
              </Link>
              <Button size="sm" className="h-8 gap-1.5" disabled>
                <Check className="h-3.5 w-3.5" /> Partagé
              </Button>
            </>
          ) : !editing ? (
            <>
              {!locked && (
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </Button>
              )}
              <Button size="sm" className="h-8 gap-1.5" onClick={() => setShareOpen(true)} disabled={locked || bloquants.length > 0}>
                <Share2 className="h-3.5 w-3.5" /> Partager
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={copyWeek}>
                <Copy className="mr-1 h-3.5 w-3.5" /> Copier
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={toggleLock}>
                {locked ? <Unlock className="mr-1 h-3.5 w-3.5" /> : <Lock className="mr-1 h-3.5 w-3.5" />}
                {locked ? "Déverr." : "Verr."}
              </Button>
              <Button size="sm" className="h-8 gap-1.5" onClick={() => setEditing(false)}>
                <Check className="h-3.5 w-3.5" /> Terminer
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      {!hideTabs && (
        <div className="border-border flex shrink-0 border-b">
          {(["planning", "criteres"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2 text-xs font-medium transition-colors",
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "planning" ? "Planning" : "Critères de génération"}
            </button>
          ))}
        </div>
      )}

      {/* ── Bandeau édition ───────────────────────────────────────────────── */}
      {activeTab === "planning" && editing && (
        <div className="border-border border-b bg-blue-50 px-4 py-1.5 text-xs text-blue-700">
          <Pencil className="mr-1.5 inline h-3 w-3" />
          Mode édition actif — cliquez sur un nom pour modifier les horaires.
        </div>
      )}

      {/* ── Bandeau d'info unifié ─────────────────────────────────────────── */}
      {activeTab === "planning" && !hideAlerts && allConflicts.length > 0 && (
        <div className={cn(
          "border-border flex items-start gap-2 border-b px-4 py-2 text-xs",
          bloquants.length > 0 ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"
        )}>
          {bloquants.length > 0
            ? <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <div>
            <span className="font-semibold">
              {bloquants.length > 0
                ? `${bloquants.length} problème${bloquants.length > 1 ? "s" : ""} bloquant${bloquants.length > 1 ? "s" : ""}${avertis.length > 0 ? ` · ${avertis.length} avertissement${avertis.length > 1 ? "s" : ""}` : ""}`
                : `${avertis.length} avertissement${avertis.length > 1 ? "s" : ""}`}
            </span>
            <span className="text-muted-foreground ml-1.5 opacity-70">— survolez les icônes pour les détails.</span>
          </div>
        </div>
      )}

      {/* ── Grille ───────────────────────────────────────────────────────── */}
      {activeTab === "criteres" && (
        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-5 p-4 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground mb-2 text-[10px] font-bold uppercase tracking-widest">Horaires restaurant</p>
              <div className="divide-border divide-y rounded-lg border text-xs">
                {HORAIRES.map((h) => (
                  <div key={h.jours} className="flex items-center justify-between px-3 py-2">
                    <span className="font-medium">{h.jours}</span>
                    <span className="text-muted-foreground text-right">
                      <span className="block">{h.plage}</span>
                      <span className="block opacity-60">{h.services}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-2 text-[10px] font-bold uppercase tracking-widest">Effectif minimum par service</p>
              <div className="space-y-1.5">
                {EFFECTIFS.map((e) => (
                  <div key={e.label} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", e.dot)} />
                      <span className="font-medium">{e.label}</span>
                      <span className="text-muted-foreground">{e.heures}</span>
                    </div>
                    <span className={cn("font-bold", e.text)}>{e.min} pers.</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-2 text-[10px] font-bold uppercase tracking-widest">Jours d'affluence</p>
              <div className="space-y-1.5">
                {AFFLUENCE.map((a) => (
                  <div key={a.jours} className={cn("flex items-center justify-between rounded-lg border px-3 py-2 text-xs", a.couleur)}>
                    <span className="font-medium">{a.jours}</span>
                    <div className="text-right">
                      <span className="block font-semibold">{a.niveau}</span>
                      <span className="block opacity-70">{a.note}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-2 text-[10px] font-bold uppercase tracking-widest">Contraintes légales</p>
              <div className="divide-border divide-y rounded-lg border text-xs">
                {CONTRAINTES.map((c) => (
                  <div key={c.label} className="flex items-center justify-between px-3 py-2">
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className="font-semibold">{c.valeur}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Vue quotidienne ─────────────────────────────────────── */}
      {activeTab === "planning" && viewMode === "jour" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {SERVICE_ROWS.map(svc => {
            const working = employees.filter(emp =>
              selectedDayShifts.some(s => s.employeeId === emp.id && s.type === svc.type)
            );
            return (
              <div key={svc.type} className="rounded-xl border border-border overflow-hidden">
                <div className={cn("flex items-center gap-2 px-4 py-2.5", svc.chip)}>
                  <span className={cn("h-2 w-2 rounded-full shrink-0", svc.dot)} />
                  <span className={cn("text-sm font-semibold", svc.text)}>{svc.label}</span>
                  <span className={cn("text-[11px] opacity-60", svc.text)}>{svc.hours}</span>
                  <span className={cn("ml-auto text-[11px] font-medium opacity-70", svc.text)}>
                    {working.length} pers.
                  </span>
                </div>
                {working.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-muted-foreground italic">Aucun service</p>
                ) : (
                  <div className="flex flex-wrap gap-2 p-3 bg-background">
                    {DEPARTMENTS.map(dept => {
                      const group = working.filter(emp =>
                        (dept.roles as readonly string[]).includes(emp.role)
                      );
                      if (!group.length) return null;
                      return (
                        <div key={dept.label} className={cn("rounded-lg px-3 py-2 min-w-[120px]", dept.bg)}>
                          <p className={cn("text-[10px] font-semibold mb-1", dept.text)}>{dept.label}</p>
                          {group.map(emp => (
                            <p key={emp.id} className={cn("text-[12px] font-medium leading-snug", dept.text)}>
                              {emp.name.split(" ")[0]}
                            </p>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Vue hebdomadaire ─────────────────────────────────────── */}
      {activeTab === "planning" && viewMode === "semaine" && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col style={{ width: "128px" }} />
              {weekDays.map((_, i) => <col key={i} />)}
            </colgroup>
            <thead className="sticky top-0 z-20">
              <tr className="border-border bg-card border-b">
                <th className="bg-card sticky left-0 z-30 px-3 py-2.5" />
                {weekDays.map((day, i) => {
                  const isToday   = toYMD(day) === todayYMD;
                  const isWeekend = i >= 5;
                  const dateStr   = toYMD(day);
                  return (
                    <th key={i} className={cn(
                      "px-1 py-2 text-center",
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
                  <td className="bg-background sticky left-0 z-10 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", svc.dot)} />
                      <p className={cn("text-sm font-semibold", svc.text)}>{svc.label}</p>
                    </div>
                  </td>
                  {svc.days.map(({ dateStr, working }, dayIdx) => {
                    const isToday   = dateStr === todayYMD;
                    const isWeekend = dayIdx >= 5;
                    const available = employees.filter((emp) => {
                      const ex = shifts.find((s) => s.employeeId === emp.id && s.date === dateStr);
                      return !ex || ex.type === "repos";
                    });
                    return (
                      <td key={dateStr} className={cn(
                        "px-1 py-2 text-center align-middle",
                        isWeekend && "bg-muted/[0.05]",
                        isToday && "bg-primary/[0.02]"
                      )}>
                        {editing ? (
                          /* ── Mode édition : liste individuelle ── */
                          <div className="flex flex-col gap-1 text-left">
                            {working.map((emp) => (
                              <div key={emp.id} className={cn(
                                "group flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors",
                                svc.chip
                              )}>
                                <button
                                  type="button"
                                  onClick={() => setEditModal({ employeeId: emp.id, date: dateStr })}
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <p className="truncate text-xs font-semibold leading-tight">{emp.name.split(" ")[0]}</p>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeEmp(emp, dateStr)}
                                  className="ml-auto shrink-0 rounded opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100 hover:text-red-600"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                            {available.length > 0 && (
                              <Popover>
                                <PopoverTrigger className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-current/20 px-2 py-1 text-[11px] text-current/40 transition-colors hover:border-current/50 hover:text-current/80">
                                  <Plus className="h-3 w-3" /> Ajouter
                                </PopoverTrigger>
                                <PopoverContent className="w-52 p-1" align="start">
                                  <p className="text-muted-foreground mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide">{svc.label}</p>
                                  {available.map((emp) => (
                                    <button
                                      key={emp.id}
                                      type="button"
                                      onClick={() => quickAdd(emp, dateStr, svc.type)}
                                      className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
                                    >
                                      <span className="flex-1 truncate text-left">{emp.name.split(" ")[0]}</span>
                                      <span className="text-muted-foreground text-[10px]">{emp.role.replace(/_/g, " ")}</span>
                                    </button>
                                  ))}
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                        ) : (
                          /* ── Mode lecture ── */
                          working.length > 0 ? (
                            showNames ? (
                              /* Noms directement visibles */
                              <div className="flex flex-col items-start gap-0.5 px-1 py-0.5">
                                {working.map(emp => (
                                  <span key={emp.id} className={cn(
                                    "text-[11px] font-medium leading-tight whitespace-nowrap",
                                    isToday ? "text-primary" : svc.text
                                  )}>
                                    {emp.name.split(" ")[0]}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              /* Count + hover tooltip */
                              <div className="group/cell relative inline-block">
                                <span className={cn(
                                  "flex h-8 w-8 cursor-default select-none items-center justify-center rounded-md text-sm font-bold transition-colors mx-auto",
                                  isToday ? "bg-primary/15 text-primary" : svc.chip
                                )}>
                                  {working.length}
                                </span>
                                <div className="pointer-events-none invisible absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 rounded-md border border-border bg-background px-2.5 py-2 shadow-md group-hover/cell:visible min-w-[120px] text-left">
                                  <p className={cn("mb-1.5 text-[10px] font-semibold uppercase tracking-wide", svc.text)}>{svc.label} · {working.length} pers.</p>
                                  {working.map(emp => (
                                    <p key={emp.id} className="text-xs text-foreground leading-relaxed whitespace-nowrap">{emp.name}</p>
                                  ))}
                                </div>
                              </div>
                            )
                          ) : (
                            <span className="text-muted-foreground/20 text-base">·</span>
                          )
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

      {/* ── Modale partage ────────────────────────────────────────────────── */}
      {shareOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShareOpen(false)} />
          <div className="fixed top-1/2 left-1/2 z-50 w-[min(26rem,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Partager le planning</p>
              </div>
              <button type="button" onClick={() => setShareOpen(false)} className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Liste destinataires */}
            <div className="max-h-72 overflow-y-auto px-5 py-3">
              <div className="text-muted-foreground mb-2.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide">
                <span>Destinataires ({selected.size}/{employees.length})</span>
                <button
                  type="button"
                  onClick={() => setSelected(selected.size === employees.length ? new Set() : new Set(employees.map(e => e.id)))}
                  className="text-primary hover:underline normal-case tracking-normal font-medium"
                >
                  {selected.size === employees.length ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              </div>
              <div className="space-y-1.5">
                {employees.map((emp) => {
                  const checked = selected.has(emp.id);
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => toggleRecipient(emp.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                        checked ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30 opacity-50"
                      )}
                    >
                      <span className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        checked ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {emp.name.charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{emp.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{toEmail(emp.name)}</p>
                      </div>
                      <div className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        checked ? "border-primary bg-primary" : "border-muted-foreground/30 bg-background"
                      )}>
                        {checked && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border bg-muted/30 flex items-center justify-end gap-2 px-5 py-3">
              <Button variant="outline" size="sm" onClick={() => setShareOpen(false)}>Annuler</Button>
              <Button
                size="sm"
                className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={selected.size === 0}
                onClick={handleShare}
              >
                <Send className="h-3.5 w-3.5" />
                Envoyer à {selected.size} personne{selected.size > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
