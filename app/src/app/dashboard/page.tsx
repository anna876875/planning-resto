"use client";

import { useState } from "react";
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
  MoreHorizontal,
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
import { mockPlannings, type PlanningRecord } from "@/lib/planning/mock-plannings";

const STATUT_BADGE: Record<
  PlanningRecord["statut"],
  { label: string; variant: "default" | "outline" | "secondary" }
> = {
  actif: { label: "Actif", variant: "default" },
  archivé: { label: "Archivé", variant: "secondary" },
  brouillon: { label: "Brouillon", variant: "outline" },
};

function handleDownload(planning: PlanningRecord) {
  const csv = [
    ["Nom", "Semaine", "Début", "Fin", "Employés", "Turns"].join(","),
    [
      planning.nom,
      planning.semaine,
      planning.dateDebut,
      planning.dateFin,
      planning.nbEmployes,
      planning.nbTurns,
    ].join(","),
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
  navigator.clipboard.writeText(url).then(() => {
    alert("Lien copié dans le presse-papier !");
  });
}

export default function DashboardPage() {
  const [newPlanningOpen, setNewPlanningOpen] = useState(false);
  const actif = mockPlannings.find((p) => p.statut === "actif");
  const archives = mockPlannings.filter((p) => p.statut !== "actif");

  return (
    <>
      {/* Header */}
      <header className="border-border bg-background sticky top-0 z-10 flex h-14 items-center justify-between border-b px-6">
        <div>
          <h1 className="text-base font-semibold">Tableau de bord</h1>
          <p className="text-muted-foreground text-xs">Gérez vos plannings et votre équipe</p>
        </div>
        <Button onClick={() => setNewPlanningOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau planning
        </Button>
      </header>

      <div className="space-y-8 p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
                <CalendarDays className="text-primary h-4 w-4" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Plannings</p>
                <p className="text-xl font-bold">{mockPlannings.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
                <Users className="text-primary h-4 w-4" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Employés</p>
                <p className="text-xl font-bold">6</p>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
                <TrendingUp className="text-primary h-4 w-4" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Turns cette semaine</p>
                <p className="text-xl font-bold">{actif?.nbTurns ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Planning actif */}
        {actif && (
          <section>
            <h2 className="mb-3 text-sm font-semibold">Planning en cours</h2>
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <CalendarDays className="text-primary-foreground h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{actif.nom}</p>
                      <Badge variant={STATUT_BADGE[actif.statut].variant}>
                        {STATUT_BADGE[actif.statut].label}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">{actif.semaine}</p>
                    <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {actif.nbEmployes} employés
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {actif.nbTurns} turns
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleDownload(actif)}>
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Télécharger
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleShare(actif)}>
                    <Share2 className="mr-1.5 h-3.5 w-3.5" />
                    Partager
                  </Button>
                  <Link
                    href="/dashboard/plannings/actif"
                    className={buttonVariants({ size: "sm" })}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Voir
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Plannings précédents */}
        <section>
          <h2 className="mb-3 text-sm font-semibold">Plannings précédents</h2>
          <div className="space-y-2">
            {archives.map((planning) => (
              <Card key={planning.id} className="hover:border-border/80 transition-colors">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                      <CalendarDays className="text-muted-foreground h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{planning.nom}</p>
                        <Badge variant={STATUT_BADGE[planning.statut].variant} className="text-xs">
                          {STATUT_BADGE[planning.statut].label}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-3 text-xs">
                        <span>{planning.semaine}</span>
                        <span>·</span>
                        <span>{planning.nbEmployes} employés</span>
                        <span>·</span>
                        <span>{planning.nbTurns} turns</span>
                      </div>
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
                        onClick={() => {
                          window.location.href = `/dashboard/plannings/${planning.id}`;
                        }}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Voir le planning
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDownload(planning)}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Télécharger (CSV)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleShare(planning)}
                        className="flex items-center gap-2"
                      >
                        <Share2 className="h-4 w-4" />
                        Copier le lien
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>

      {/* Modal nouveau planning */}
      <Dialog open={newPlanningOpen} onOpenChange={setNewPlanningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau planning</DialogTitle>
            <DialogDescription>
              Choisissez la semaine pour générer automatiquement un planning pour votre équipe.
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewPlanningOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => {
                  setNewPlanningOpen(false);
                  window.location.href = "/dashboard/plannings/actif";
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Créer le planning
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
