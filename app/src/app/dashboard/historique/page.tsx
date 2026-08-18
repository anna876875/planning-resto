import { History } from "lucide-react";

export default function HistoriquePage() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-6 md:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Historique</h1>
      </div>
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center md:px-6">
        <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-2xl">
          <History className="text-muted-foreground h-8 w-8" />
        </div>
        <div>
          <p className="font-semibold">Historique des actions</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Cette section affichera l'historique des modifications de plannings, des changements d'équipe et des actions effectuées.
          </p>
        </div>
      </div>
    </div>
  );
}
