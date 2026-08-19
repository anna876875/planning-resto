// Générateur de planning — algorithme glouton avec contraintes légales et équité

import type { Employee, Shift, ShiftType } from "@/types/planning";
import type { PlanningConfig } from "./config";

const IDX_TO_JSDAY = [1, 2, 3, 4, 5, 6, 0]; // index semaine (0=Lun) → JS getDay()

const SVCS = ["matin", "soir"] as const;
type SvcKey = (typeof SVCS)[number];

function hhmm(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}

function dateISO(weekStart: string, dayOffset: number): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dayOffset));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export interface GenerationResult {
  shifts:   Shift[];
  warnings: string[];
  stats: {
    totalEmployes:      number;
    heuresTotal:        number;
    joursParEmploye:    Record<string, number>;
    weekendsParEmploye: Record<string, number>;
  };
}

export function generateWeekSchedule(
  weekStart: string,
  employees: Employee[],
  cfg:       PlanningConfig,
): GenerationResult {
  const warnings: string[] = [];

  // pattern[empId][dayIdx] = shift type (Lun=0…Dim=6)
  const pattern: Record<string, ShiftType[]> = {};
  employees.forEach(e => { pattern[e.id] = Array(7).fill("repos" as ShiftType); });

  // Heures de début/fin par service depuis la config
  const svcStart: Record<string, number> = {
    matin: hhmm(cfg.services.matin.debut),
    soir:  hhmm(cfg.services.soir.debut),
  };
  const svcEnd: Record<string, number> = {
    matin: hhmm(cfg.services.matin.fin),
    soir:  hhmm(cfg.services.soir.fin),
  };

  function workedSoFar(empId: string, upTo: number): number {
    return pattern[empId].slice(0, upTo).filter(s => s !== "repos").length;
  }

  function weekendsSoFar(empId: string, upTo: number): number {
    return pattern[empId].slice(0, upTo).filter((s, i) => s !== "repos" && i >= 4).length;
  }

  function canWork(empId: string, dayIdx: number, svc: string): boolean {
    if (pattern[empId][dayIdx] !== "repos") return false;

    const maxWorkDays = Math.round(cfg.heuresContratHebdo / 8);
    if (workedSoFar(empId, dayIdx) >= maxWorkDays) return false;

    if (dayIdx >= cfg.joursConsecutifsMax) {
      const lastN = pattern[empId].slice(dayIdx - cfg.joursConsecutifsMax, dayIdx);
      if (lastN.every(s => s !== "repos")) return false;
    }

    if (dayIdx > 0) {
      const prev = pattern[empId][dayIdx - 1];
      if (prev !== "repos" && svcEnd[prev] !== undefined) {
        const gap = (24 - svcEnd[prev]) + svcStart[svc];
        if (gap < cfg.reposEntreServicesH) return false;
      }
    }

    return true;
  }

  // ── Assignation jour par jour ──────────────────────────────────
  for (let dayIdx = 0; dayIdx < 6; dayIdx++) {
    const jsDay    = IDX_TO_JSDAY[dayIdx];
    const openSvcs = cfg.disponibilites[jsDay] ?? [];
    if (!openSvcs.length) continue;

    const isWeekend = dayIdx >= 4;

    for (const svc of SVCS) {
      if (!cfg.services[svc].actif || !openSvcs.includes(svc)) continue;

      const svcCfg  = cfg.services[svc];
      const target  = svcCfg.joursAffluence.includes(jsDay)
        ? svcCfg.effectifAffluence
        : svcCfg.effectifStable;

      const sorted = [...employees].sort((a, b) => {
        const aW = workedSoFar(a.id, dayIdx);
        const bW = workedSoFar(b.id, dayIdx);
        if (aW !== bW) return aW - bW;
        if (cfg.weekendEquitable && isWeekend) {
          return weekendsSoFar(a.id, dayIdx) - weekendsSoFar(b.id, dayIdx);
        }
        return 0;
      });

      const assigned = new Set<string>();
      const candidates = sorted.filter(e => !assigned.has(e.id) && canWork(e.id, dayIdx, svc));
      candidates.slice(0, target).forEach(e => {
        pattern[e.id][dayIdx] = svc as ShiftType;
        assigned.add(e.id);
      });

      if (assigned.size < target) {
        warnings.push(`Effectif insuffisant pour ${svc} le jour ${dayIdx + 1} (${assigned.size}/${target})`);
      }
    }
  }

  // ── Garantir les jours de repos minimum ───────────────────────
  const maxWorkDays = 7 - cfg.joursReposParSemaine;
  employees.forEach(emp => {
    const workDays = pattern[emp.id]
      .map((s, i) => ({ s, i }))
      .filter(x => x.s !== "repos");

    if (workDays.length > maxWorkDays) {
      const toRemove = cfg.weekendEquitable
        ? [...workDays].sort((a, b) => (a.i >= 4 ? 1 : -1) - (b.i >= 4 ? 1 : -1))
        : workDays;
      toRemove.slice(maxWorkDays).forEach(({ i }) => {
        pattern[emp.id][i] = "repos";
      });
    }
  });

  // ── Convertir en Shift[] ───────────────────────────────────────
  const TIMES: Record<string, { start: string; end: string }> = {
    matin: { start: cfg.services.matin.debut, end: cfg.services.matin.fin },
    soir:  { start: cfg.services.soir.debut,  end: cfg.services.soir.fin  },
    repos: { start: "",                        end: ""                     },
  };

  const shifts: Shift[] = employees.flatMap(emp =>
    pattern[emp.id].map((type, dayIdx) => ({
      id:         `gen-${emp.id}-${weekStart}-${dayIdx}`,
      employeeId: emp.id,
      date:       dateISO(weekStart, dayIdx),
      type,
      ...(TIMES[type] ?? { start: "", end: "" }),
    }))
  );

  // ── Stats ──────────────────────────────────────────────────────
  const joursParEmploye: Record<string, number>    = {};
  const weekendsParEmploye: Record<string, number> = {};
  let heuresTotal = 0;

  employees.forEach(emp => {
    const worked = pattern[emp.id].filter(s => s !== "repos");
    joursParEmploye[emp.id]    = worked.length;
    weekendsParEmploye[emp.id] = pattern[emp.id].filter((s, i) => s !== "repos" && i >= 4).length;
    worked.forEach(s => {
      heuresTotal += (svcEnd[s] ?? 0) - (svcStart[s] ?? 0);
    });
  });

  return {
    shifts,
    warnings,
    stats: {
      totalEmployes:      employees.filter(e => joursParEmploye[e.id] > 0).length,
      heuresTotal:        Math.round(heuresTotal),
      joursParEmploye,
      weekendsParEmploye,
    },
  };
}
