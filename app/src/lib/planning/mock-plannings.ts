export interface PlanningRecord {
  id: string;
  nom: string;
  semaine: string;
  dateDebut: string;
  dateFin: string;
  statut: "actif" | "archivé" | "brouillon";
  nbEmployes: number;
  nbTurns: number;
  modifications: number;
}

export const mockPlannings: PlanningRecord[] = [
  {
    id: "p-1",
    nom: "Semaine du 18 août",
    semaine: "S34 2026",
    dateDebut: "2026-08-18",
    dateFin: "2026-08-24",
    statut: "actif",
    nbEmployes: 15,
    nbTurns: 38,
    modifications: 0,
  },
  {
    id: "p-2",
    nom: "Semaine du 11 août",
    semaine: "S33 2026",
    dateDebut: "2026-08-11",
    dateFin: "2026-08-17",
    statut: "archivé",
    nbEmployes: 15,
    nbTurns: 36,
    modifications: 3,
  },
  {
    id: "p-3",
    nom: "Semaine du 4 août",
    semaine: "S32 2026",
    dateDebut: "2026-08-04",
    dateFin: "2026-08-10",
    statut: "archivé",
    nbEmployes: 15,
    nbTurns: 34,
    modifications: 0,
  },
  {
    id: "p-4",
    nom: "Semaine du 28 juillet",
    semaine: "S31 2026",
    dateDebut: "2026-07-28",
    dateFin: "2026-08-03",
    statut: "archivé",
    nbEmployes: 15,
    nbTurns: 30,
    modifications: 1,
  },
];
