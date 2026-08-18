"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Share2, Printer } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { PlanningView } from "@/components/planning/PlanningView";
import { mockPlannings } from "@/lib/planning/mock-plannings";

export default function PlanningDetailPage() {
  const { id } = useParams<{ id: string }>();
  const planning = mockPlannings.find((p) => p.id === id) ?? mockPlannings[0];

  function handleDownload() {
    const csv = ["Employé,Rôle,Lun,Mar,Mer,Jeu,Ven,Sam,Dim"].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planning-${planning.semaine.replace(" ", "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert("Lien copié dans le presse-papier !");
    });
  }

  return (
    <div className="flex flex-col">
      {/* Retour */}
      <div className="border-border bg-background sticky top-0 z-20 flex h-12 items-center border-b px-6">
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "ghost", size: "icon", className: "h-8 w-8" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      {/* Titre + actions */}
      <div className="flex items-start justify-between border-b border-border px-6 py-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{planning.nom}</h1>
          <p className="text-muted-foreground text-sm">{planning.semaine}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Imprimer
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Télécharger
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-1.5 h-3.5 w-3.5" /> Partager
          </Button>
        </div>
      </div>

      {/* Planning grid */}
      <PlanningView />
    </div>
  );
}
