export interface PlanningRecord {
  id: string;
  nom: string;
  semaine: string; // "S32 2026"
  dateDebut: string; // "2026-08-03"
  dateFin: string; // "2026-08-09"
  statut: "actif" | "archivé" | "brouillon";
  nbEmployes: number;
  nbTurns: number;
}

export const mockPlannings: PlanningRecord[] = [
  {
    id: "p-1",
    nom: "Semaine du 11 août",
    semaine: "S33 2026",
    dateDebut: "2026-08-11",
    dateFin: "2026-08-17",
    statut: "actif",
    nbEmployes: 6,
    nbTurns: 36,
  },
  {
    id: "p-2",
    nom: "Semaine du 4 août",
    semaine: "S32 2026",
    dateDebut: "2026-08-04",
    dateFin: "2026-08-10",
    statut: "archivé",
    nbEmployes: 6,
    nbTurns: 34,
  },
  {
    id: "p-3",
    nom: "Semaine du 28 juillet",
    semaine: "S31 2026",
    dateDebut: "2026-07-28",
    dateFin: "2026-08-03",
    statut: "archivé",
    nbEmployes: 5,
    nbTurns: 30,
  },
  {
    id: "p-4",
    nom: "Semaine du 21 juillet",
    semaine: "S30 2026",
    dateDebut: "2026-07-21",
    dateFin: "2026-07-27",
    statut: "archivé",
    nbEmployes: 6,
    nbTurns: 38,
  },
];
