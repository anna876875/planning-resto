export type Role = "chef_cuisine" | "chef_partie" | "serveur" | "barman" | "plongeur";
export type ShiftType = "matin" | "soir" | "coupure" | "repos";

export interface Employee {
  id: string;
  name: string;
  role: Role;
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
