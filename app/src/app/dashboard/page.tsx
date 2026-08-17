"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  CalendarDays,
  Download,
  Share2,
  Eye,
  Users,
  Clock,
  TrendingUp,
  CheckCircle2,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { mockPlannings, type PlanningRecord } from "@/lib/planning/mock-plannings";
import { employees, getShiftsForWeek } from "@/lib/planning/mock-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toYMD(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getMondayOf(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function shiftHours(type: string): number {
  if (type === "matin" || type === "soir") return 8;
  if (type === "coupure") return 13;
  return 0;
}

const JOURS_COURT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const JOURS_LONG = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MOIS_COURT = [
  "jan", "fév", "mar", "avr", "mai", "juin",
  "juil", "août", "sep", "oct", "nov", "déc",
];

const SHIFT_COLORS: Record<string, string> = {
  matin: "bg-blue-100 text-blue-700",
  soir: "bg-violet-100 text-violet-700",
  coupure: "bg-amber-100 text-amber-700",
};

const STATUT_BADGE: Record<
  PlanningRecord["statut"],
  { label: string; variant: "default" | "outline" | "secondary" }
> = {
  actif: { label: "Actif", variant: "default" },
  archivé: { label: "Archivé", variant: "secondary" },
  brouillon: { label: "Brouillon", variant: "outline" },
};

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            accent ? "bg-primary" : "bg-primary/10"
          )}
        >
          <Icon className={cn("h-5 w-5", accent ? "text-primary-foreground" : "text-primary")} />
        </div>
        <div>
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="text-xl font-bold leading-tight">{value}</p>
          {sub && <p className="text-muted-foreground text-[11px]">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Download / Share ─────────────────────────────────────────────────────────

function handleDownload(planning: PlanningRecord) {
  const csv = [
    ["Nom", "Semaine", "Début", "Fin", "Employés", "Turns"].join(","),
    [planning.nom, planning.semaine, planning.dateDebut, planning.dateFin, planning.nbEmployes, planning.nbTurns].join(","),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `planning-${planning.semaine.replace(" ", "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleShare(planning: PlanningRecord) {
  const url = `${window.location.origin}/dashboard/plannings/${planning.id}`;
  navigator.clipboard.writeText(url).then(() => alert("Lien copié !"));
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [newPlanningOpen, setNewPlanningOpen] = useState(false);

  const today = useMemo(() => new Date(), []);
  const todayYMD = toYMD(today);
  const monday = getMondayOf(today);
  const weekStart = toYMD(monday);
  const weekShifts = useMemo(() => getShiftsForWeek(weekStart), [weekStart]);

  const totalHours = useMemo(
    () => weekShifts.reduce((acc, s) => acc + shiftHours(s.type), 0),
    [weekShifts]
  );

  const todayShifts = useMemo(
    () =>
      weekShifts
        .filter((s) => s.date === todayYMD && s.type !== "repos")
        .map((s) => ({
          ...s,
          employee: employees.find((e) => e.id === s.employeeId),
        })),
    [weekShifts, todayYMD]
  );

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(monday, i);
        const dateYMD = toYMD(date);
        const dayShifts = weekShifts.filter((s) => s.date === dateYMD && s.type !== "repos");
        return {
          label: JOURS_COURT[i],
          date: `${date.getDate()}`,
          dateYMD,
          isToday: dateYMD === todayYMD,
          isWeekend: i >= 5,
          workers: dayShifts.map((s) => ({
            name: employees.find((e) => e.id === s.employeeId)?.name.split(" ")[0] ?? "?",
            type: s.type,
          })),
        };
      }),
    [monday, weekShifts, todayYMD]
  );

  const actif = mockPlannings.find((p) => p.statut === "actif");
  const autresPlannings = mockPlannings.filter((p) => p.statut !== "actif");

  const hour = today.getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const dateLabel = `${JOURS_LONG[today.getDay()]} ${today.getDate()} ${MOIS_COURT[today.getMonth()]}`;

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-border bg-background sticky top-0 z-10 flex h-14 items-center justify-between border-b px-4 md:px-6">
        <div>
          <h1 className="text-sm font-semibold md:text-base">{greeting} !</h1>
          <p className="text-muted-foreground hidden text-xs capitalize md:block">{dateLabel}</p>
        </div>
        <Button size="sm" onClick={() => setNewPlanningOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          <span className="hidden sm:inline">Nouveau planning</span>
          <span className="sm:hidden">Nouveau</span>
        </Button>
      </header>

      <div className="space-y-6 p-4 md:space-y-10 md:p-6">

        {/* ── Aujourd'hui (mobile uniquement) ──────────────────────────────── */}
        <section className="md:hidden">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Aujourd&apos;hui ·{" "}
              <span className="text-muted-foreground font-normal capitalize">{dateLabel}</span>
            </h2>
            <Link
              href="/dashboard/plannings/actif"
              className="text-primary flex items-center gap-0.5 text-xs font-medium"
            >
              Planning
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {todayShifts.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground p-4 text-sm">
                Aucun shift aujourd&apos;hui.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {todayShifts.map((s) => (
                <Card key={s.id}>
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-primary">
                        {s.employee?.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s.employee?.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {s.start} – {s.end}
                        </p>
                      </div>
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", SHIFT_COLORS[s.type])}>
                      {s.type === "matin" ? "Matin" : s.type === "soir" ? "Soir" : "Coupure"}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ── KPIs ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          <KpiCard icon={Users} label="Employés actifs" value={employees.length} />
          <KpiCard
            icon={Clock}
            label="Heures planifiées"
            value={`${totalHours}h`}
            sub="cette semaine"
          />
          <KpiCard
            icon={CheckCircle2}
            label="Au travail aujourd'hui"
            value={todayShifts.length}
            accent
          />
          <KpiCard icon={TrendingUp} label="Plannings" value={mockPlannings.length} />
        </div>

        {/* ── Planning de la semaine ────────────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Planning de la semaine</h2>
              <p className="text-muted-foreground text-xs">
                {monday.getDate()} {MOIS_COURT[monday.getMonth()]} –{" "}
                {addDays(monday, 6).getDate()} {MOIS_COURT[addDays(monday, 6).getMonth()]}
              </p>
            </div>
            <Link
              href="/dashboard/plannings/actif"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Voir le planning complet</span>
              <span className="sm:hidden">Complet</span>
            </Link>
          </div>

          {/* Défilement horizontal sur mobile, grille 7 col sur desktop */}
          <div className="-mx-4 md:mx-0">
            <div className="flex gap-2 overflow-x-auto px-4 pb-2 md:grid md:grid-cols-7 md:overflow-x-visible md:px-0 md:pb-0">
              {weekDays.map((day) => (
                <Link
                  key={day.dateYMD}
                  href="/dashboard/plannings/actif"
                  className={cn(
                    "w-28 shrink-0 overflow-hidden rounded-xl border transition-shadow hover:shadow-sm md:w-auto",
                    day.isToday ? "border-primary ring-primary ring-2" : "border-border",
                    day.isWeekend && !day.isToday && "bg-muted/30"
                  )}
                >
                  <div className="p-2.5">
                    <div
                      className={cn(
                        "mb-2 flex items-baseline gap-1 text-xs font-semibold",
                        day.isToday ? "text-primary" : "text-foreground"
                      )}
                    >
                      {day.label}
                      <span className="text-muted-foreground font-normal">{day.date}</span>
                    </div>
                    <p className="text-lg font-bold leading-none">{day.workers.length}</p>
                    <p className="text-muted-foreground mb-2 text-[10px]">
                      / {employees.length}
                    </p>
                    <div className="space-y-0.5">
                      {day.workers.slice(0, 3).map((w) => (
                        <span
                          key={w.name}
                          className={cn(
                            "block truncate rounded px-1 py-0.5 text-[10px] font-medium",
                            SHIFT_COLORS[w.type]
                          )}
                        >
                          {w.name}
                        </span>
                      ))}
                      {day.workers.length > 3 && (
                        <span className="text-muted-foreground text-[10px]">
                          +{day.workers.length - 3}
                        </span>
                      )}
                      {day.workers.length === 0 && (
                        <span className="text-muted-foreground text-[10px]">Fermé</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Planning en cours ─────────────────────────────────────────────── */}
        {actif && (
          <section>
            <h2 className="mb-3 text-sm font-semibold">Planning en cours</h2>
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start gap-3">
                  <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                    <CalendarDays className="text-primary-foreground h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{actif.nom}</p>
                      <Badge variant={STATUT_BADGE[actif.statut].variant}>
                        {STATUT_BADGE[actif.statut].label}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">{actif.semaine}</p>
                    <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                      <span>{actif.nbEmployes} employés</span>
                      <span>·</span>
                      <span>{actif.nbTurns} turns</span>
                    </div>
                  </div>
                </div>

                {/* Actions — ligne complète sur mobile */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => handleDownload(actif)}>
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Télécharger
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => handleShare(actif)}>
                    <Share2 className="mr-1.5 h-3.5 w-3.5" />
                    Partager
                  </Button>
                  <Link
                    href="/dashboard/plannings/actif"
                    className={buttonVariants({ size: "sm", className: "flex-1 sm:flex-none justify-center" })}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Voir
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ── Plannings précédents ──────────────────────────────────────────── */}
        <section className="pb-2">
          <h2 className="mb-3 text-sm font-semibold">Plannings précédents</h2>
          <div className="space-y-2">
            {autresPlannings.map((planning) => (
              <Card key={planning.id}>
                <CardContent className="flex items-center justify-between p-3 md:p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                      <CalendarDays className="text-muted-foreground h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{planning.nom}</p>
                        <Badge variant={STATUT_BADGE[planning.statut].variant} className="shrink-0 text-xs">
                          {STATUT_BADGE[planning.statut].label}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {planning.semaine} · {planning.nbEmployes} emp. · {planning.nbTurns} turns
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={buttonVariants({
                        variant: "ghost",
                        size: "icon",
                        className: "h-8 w-8 shrink-0",
                      })}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => { window.location.href = `/dashboard/plannings/${planning.id}`; }}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" /> Voir le planning
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDownload(planning)}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" /> Télécharger
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleShare(planning)}
                        className="flex items-center gap-2"
                      >
                        <Share2 className="h-4 w-4" /> Copier le lien
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>

      {/* ── Modal nouveau planning ──────────────────────────────────────────── */}
      <Dialog open={newPlanningOpen} onOpenChange={setNewPlanningOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Créer un nouveau planning</DialogTitle>
            <DialogDescription>
              Choisissez la semaine pour votre équipe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Semaine de début</label>
              <input
                type="week"
                className="border-input bg-background flex h-9 w-full rounded-lg border px-3 py-1 text-sm"
                defaultValue="2026-W34"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setNewPlanningOpen(false)} className="sm:order-first">
                Annuler
              </Button>
              <Button
                onClick={() => {
                  setNewPlanningOpen(false);
                  window.location.href = "/dashboard/plannings/actif";
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
