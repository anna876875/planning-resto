export type ContratType = "CDI" | "CDD" | "temps_partiel" | "extra";
export type StatutEmploye = "actif" | "congé" | "arrêt_maladie";
export type AlerteType = "weekends_consecutifs" | "heures_sup" | "jours_consecutifs";

export interface AlerteEmploye {
  type: AlerteType;
  label: string;
  valeur?: number;
}

export interface Indisponibilite {
  debut: string;
  fin?: string;
  motif?: string;
}

export interface EmployeDetail {
  id: string;
  nom: string;
  poste: string;
  email: string;
  telephone: string;
  statut: StatutEmploye;
  contrat: ContratType;
  heuresHebdo: number;
  heuresReelles?: number;
  dateDebut: string;
  dateFinCDD?: string;
  joursTravail: ("Lun" | "Mar" | "Mer" | "Jeu" | "Ven" | "Sam" | "Dim")[];
  services: ("matin" | "soir" | "coupure")[];
  note?: string;
  alertes?: AlerteEmploye[];
  indisponibilites?: Indisponibilite[];
}

export const equipe: EmployeDetail[] = [
  {
    id: "1",
    nom: "Marie Dupont",
    poste: "Chef de cuisine",
    email: "marie.dupont@restaurant.fr",
    telephone: "06 12 34 56 78",
    statut: "actif",
    contrat: "CDI",
    heuresHebdo: 35,
    heuresReelles: 42,
    dateDebut: "2021-03-15",
    joursTravail: ["Lun", "Mar", "Jeu", "Ven"],
    services: ["matin"],
    note: "Responsable des menus et commandes fournisseurs.",
    alertes: [
      { type: "heures_sup", label: "+7h heures sup", valeur: 7 },
      { type: "jours_consecutifs", label: "5 jours consécutifs", valeur: 5 },
    ],
    indisponibilites: [
      { debut: "2026-08-20", motif: "Rendez-vous médical" },
    ],
  },
  {
    id: "2",
    nom: "Thomas Laurent",
    poste: "Chef de partie",
    email: "thomas.laurent@restaurant.fr",
    telephone: "06 23 45 67 89",
    statut: "actif",
    contrat: "CDI",
    heuresHebdo: 35,
    heuresReelles: 39,
    dateDebut: "2022-09-01",
    joursTravail: ["Lun", "Mar", "Mer", "Ven"],
    services: ["soir"],
    alertes: [
      { type: "heures_sup", label: "+4h heures sup", valeur: 4 },
    ],
    indisponibilites: [
      { debut: "2026-09-10", fin: "2026-09-12", motif: "Déménagement" },
      { debut: "2026-10-02", motif: "Formation externe" },
    ],
  },
  {
    id: "3",
    nom: "Julie Martin",
    poste: "Serveuse",
    email: "julie.martin@restaurant.fr",
    telephone: "06 34 56 78 90",
    statut: "actif",
    contrat: "CDI",
    heuresHebdo: 35,
    heuresReelles: 35,
    dateDebut: "2023-01-10",
    joursTravail: ["Mar", "Mer", "Ven", "Sam"],
    services: ["matin"],
    alertes: [
      { type: "weekends_consecutifs", label: "3 weekends consécutifs", valeur: 3 },
    ],
    indisponibilites: [
      { debut: "2026-08-25", motif: "Mariage familial" },
      { debut: "2026-09-15", fin: "2026-09-16" },
      { debut: "2026-10-10", motif: "Rendez-vous administratif" },
    ],
  },
  {
    id: "4",
    nom: "Lucas Bernard",
    poste: "Serveur",
    email: "lucas.bernard@restaurant.fr",
    telephone: "06 45 67 89 01",
    statut: "congé",
    contrat: "CDI",
    heuresHebdo: 35,
    dateDebut: "2023-06-20",
    joursTravail: ["Lun", "Mar", "Jeu", "Ven"],
    services: ["soir"],
    note: "Congés annuels jusqu'au 25 août 2026.",
    indisponibilites: [],
  },
  {
    id: "5",
    nom: "Emma Petit",
    poste: "Barmaid",
    email: "emma.petit@restaurant.fr",
    telephone: "06 56 78 90 12",
    statut: "actif",
    contrat: "temps_partiel",
    heuresHebdo: 24,
    heuresReelles: 28,
    dateDebut: "2024-02-05",
    joursTravail: ["Mer", "Jeu", "Sam"],
    services: ["soir", "coupure"],
    note: "Disponible le week-end uniquement en journée.",
    alertes: [
      { type: "weekends_consecutifs", label: "4 weekends consécutifs", valeur: 4 },
      { type: "heures_sup", label: "+4h heures sup", valeur: 4 },
    ],
    indisponibilites: [],
  },
  {
    id: "6",
    nom: "Nicolas Roux",
    poste: "Plongeur",
    email: "nicolas.roux@restaurant.fr",
    telephone: "06 67 89 01 23",
    statut: "arrêt_maladie",
    contrat: "CDD",
    heuresHebdo: 20,
    dateDebut: "2026-04-01",
    dateFinCDD: "2026-10-31",
    joursTravail: ["Lun", "Mer", "Jeu", "Sam"],
    services: ["matin"],
    note: "CDD saisonnier. Arrêt maladie en cours depuis le 12 août.",
    indisponibilites: [],
  },
];
