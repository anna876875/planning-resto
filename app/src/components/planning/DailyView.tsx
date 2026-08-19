"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { employees, getShiftsForWeek } from "@/lib/planning/mock-data";

// ─── Config ──────────────────────────────────────────────────────────────────

const SERVICES = [
  { key: "ouverture", label: "Ouverture", startH: "07h", bg: "bg-sky-50",    border: "border-sky-200",    text: "text-sky-800",    dot: "bg-sky-500"    },
  { key: "midi",      label: "Midi",      startH: "11h", bg: "bg-teal-50",   border: "border-teal-200",   text: "text-teal-800",  dot: "bg-teal-500"   },
  { key: "soir",      label: "Soir",      startH: "15h", bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-800", dot: "bg-violet-500" },
] as const;

const DEPARTMENTS = [
  { label: "Cuisine", roles: ["chef_cuisine", "chef_partie"], bg: "bg-orange-100", text: "text-orange-700" },
  { label: "Salle",   roles: ["serveur"],                     bg: "bg-blue-100",   text: "text-blue-700"  },
  { label: "Bar",     roles: ["barman"],                      bg: "bg-violet-100", text: "text-violet-700"},
  { label: "Plonge",  roles: ["plongeur"],                    bg: "bg-slate-100",  text: "text-slate-600" },
];

const JOURS  = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MOIS   = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];

// ─── Utils ───────────────────────────────────────────────────────────────────

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMondayOf(d: Date): string {
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return toISO(monday);
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function DailyView({ initialDate }: { initialDate?: string }) {
  const [current, setCurrent] = useState<Date>(() => {
    if (initialDate) {
      const [y, m, d] = initialDate.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  });

  const iso     = toISO(current);
  const monday  = getMondayOf(current);
  const shifts  = useMemo(() => getShiftsForWeek(monday), [monday]);

  const dayShifts = useMemo(
    () => shifts.filter(s => s.date === iso),
    [shifts, iso]
  );

  const totalWorking = useMemo(
    () => new Set(dayShifts.filter(s => s.type !== "repos").map(s => s.employeeId)).size,
    [dayShifts]
  );

  function prev() { const d = new Date(current); d.setDate(d.getDate() - 1); setCurrent(d); }
  function next() { const d = new Date(current); d.setDate(d.getDate() + 1); setCurrent(d); }

  return (
    <div className="flex flex-col gap-4 p-4">

      {/* Navigation date */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold capitalize">
            {JOURS[current.getDay()]} {current.getDate()} {MOIS[current.getMonth()]} {current.getFullYear()}
          </p>
          <p className="text-muted-foreground text-[11px]">
            {totalWorking} employé{totalWorking > 1 ? "s" : ""} en service
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Services */}
      <div className="flex flex-col gap-3">
        {SERVICES.map(svc => {
          const working = employees.filter(emp =>
            dayShifts.some(s => s.employeeId === emp.id && s.type === svc.key)
          );

          return (
            <div key={svc.key} className={cn("rounded-xl border p-4", svc.bg, svc.border)}>
              {/* En-tête service */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", svc.dot)} />
                  <span className={cn("text-sm font-semibold", svc.text)}>{svc.label}</span>
                  <span className={cn("text-[10px] font-light", svc.text)}>· {svc.startH}</span>
                </div>
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  working.length === 0 ? "bg-muted/40 text-muted-foreground" : `${svc.bg} ${svc.text}`
                )}>
                  {working.length} pers.
                </span>
              </div>

              {/* Employés par département */}
              {working.length === 0 ? (
                <p className="text-muted-foreground/50 text-[11px]">Aucun employé sur ce service</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {DEPARTMENTS.map(dept => {
                    const group = working.filter(emp =>
                      (dept.roles as readonly string[]).includes(emp.role)
                    );
                    if (!group.length) return null;
                    return (
                      <div key={dept.label} className={cn("rounded-lg px-2.5 py-2 min-w-[80px]", dept.bg)}>
                        <p className={cn("mb-1 text-[9px] font-bold uppercase tracking-wide opacity-60", dept.text)}>
                          {dept.label}
                        </p>
                        {group.map(emp => (
                          <p key={emp.id} className={cn("text-[11px] font-medium leading-snug", dept.text)}>
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

      {/* Coupure visuelle */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-muted-foreground/50 text-[10px] font-light tracking-widest">coupure</span>
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
