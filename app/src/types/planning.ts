export type Role = "chef_cuisine" | "chef_partie" | "serveur" | "barman" | "plongeur";
export type ShiftType =
  | "ouverture"
  | "midi"
  | "soir"
  | "fermeture"
  | "matin"
  | "coupure"
  | "repos"
  | "conge";

export interface Absence {
  id: string;
  dateDebut: string; // YYYY-MM-DD
  dateFin: string;   // YYYY-MM-DD
  type: "conge" | "maladie" | "autre";
  valide: boolean;
}

/** jsDay (0=Dim, 1=Lun … 6=Sam) → services autorisés ce jour */
export type DispoHebdo = Partial<Record<number, ("matin" | "soir")[]>>;

export interface Employee {
  id: string;
  name: string;
  role: Role;
  heuresContratHebdo: number;
  disponibilites?: DispoHebdo;
  absences?: Absence[];
}

export interface Shift {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  type: ShiftType;
  start: string; // HH:mm
  end: string;
}

export type PlanningStatus = "brouillon" | "publié" | "modifié" | "verrouillé";
