import type { Employee, Shift, ShiftType } from "@/types/planning";

export const employees: Employee[] = [
  { id: "1", name: "Marie Dupont",    role: "chef_cuisine" },
  { id: "2", name: "Thomas Laurent",  role: "chef_partie"  },
  { id: "3", name: "Julie Martin",    role: "serveur"      },
  { id: "4", name: "Lucas Bernard",   role: "serveur"      },
  { id: "5", name: "Emma Petit",      role: "barman"       },
  { id: "6", name: "Nicolas Roux",    role: "plongeur"     },
];

// Règles respectées :
//  • max 35h/sem  (matin=8h, soir=8h, coupure=13h)
//  • repos ≥ 11h entre deux shifts (soir→matin interdit, soir/coupure→coupure ok ≥11h)
//  • max 3 jours consécutifs
//  • chaque service : 0 ou ≥ 2 personnes (matin/soir), 0 ou ≥ 1 (coupure)
//
// Couverture résultante :
//  Lun : matin=[1,6], soir=[2,4]
//  Mar : matin=[1,3], soir=[2,4]
//  Mer : matin=[3,6], soir=[2,5]
//  Jeu : matin=[1,6], soir=[4,5]
//  Ven : matin=[1,3], soir=[2,4]
//  Sam : matin=[3,6], coupure=[5]   (repos soir — service allégé)
//  Dim : repos (restaurant fermé)
const WEEK_PATTERNS: Record<string, ShiftType[]> = {
  "1": ["matin",   "matin",   "repos",   "matin",   "matin",   "repos",   "repos"],
  "2": ["soir",    "soir",    "soir",    "repos",   "soir",    "repos",   "repos"],
  "3": ["repos",   "matin",   "matin",   "repos",   "matin",   "matin",   "repos"],
  "4": ["soir",    "soir",    "repos",   "soir",    "soir",    "repos",   "repos"],
  "5": ["repos",   "repos",   "soir",    "soir",    "repos",   "coupure", "repos"],
  "6": ["matin",   "repos",   "matin",   "matin",   "repos",   "matin",   "repos"],
};

const SHIFT_TIMES: Record<ShiftType, { start: string; end: string }> = {
  matin:   { start: "07:00", end: "15:00" },
  soir:    { start: "15:00", end: "23:00" },
  coupure: { start: "10:00", end: "23:00" },
  repos:   { start: "",      end: ""      },
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

export function getShiftsForWeek(weekStart: string): Shift[] {
  return employees.flatMap((employee) =>
    WEEK_PATTERNS[employee.id].map((type, day) => ({
      id: `${employee.id}-${weekStart}-${day}`,
      employeeId: employee.id,
      date: addDays(weekStart, day),
      type,
      ...SHIFT_TIMES[type],
    }))
  );
}
