import type { Employee, Shift, ShiftType } from "@/types/planning";

export const employees: Employee[] = [
  // Cuisine (4)
  { id: "1",  name: "Marie Dupont",     role: "chef_cuisine" },
  { id: "2",  name: "Thomas Laurent",   role: "chef_partie"  },
  { id: "7",  name: "Sophie Moreau",    role: "chef_cuisine" },
  { id: "8",  name: "Antoine Lefèvre",  role: "chef_partie"  },
  // Salle (5)
  { id: "3",  name: "Julie Martin",     role: "serveur"      },
  { id: "4",  name: "Lucas Bernard",    role: "serveur"      },
  { id: "10", name: "Camille Blanc",    role: "serveur"      },
  { id: "11", name: "Hugo Dubois",      role: "serveur"      },
  { id: "15", name: "Inès Fontaine",    role: "serveur"      },
  // Bar (3)
  { id: "5",  name: "Emma Petit",       role: "barman"       },
  { id: "12", name: "Léa Simon",        role: "barman"       },
  { id: "13", name: "Maxime Durand",    role: "barman"       },
  // Plonge (3)
  { id: "6",  name: "Nicolas Roux",     role: "plongeur"     },
  { id: "14", name: "Kevin Martin",     role: "plongeur"     },
  { id: "16", name: "Yasmine Chabane",  role: "plongeur"     },
];

// Lun→Dim · 2 services : matin (08-16) et soir (18-23)
const WEEK_PATTERNS: Record<string, ShiftType[]> = {
  // Cuisine — 2 en matin, 2 en soir
  "1":  ["matin", "matin", "repos", "matin", "matin", "repos", "repos"],
  "2":  ["soir",  "soir",  "soir",  "repos", "soir",  "repos", "repos"],
  "7":  ["repos", "matin", "matin", "matin", "repos", "matin", "repos"],
  "8":  ["soir",  "repos", "soir",  "soir",  "soir",  "repos", "repos"],
  // Salle — mix matin/soir
  "3":  ["repos", "matin", "matin", "repos", "matin", "matin", "repos"],
  "4":  ["soir",  "soir",  "repos", "soir",  "soir",  "repos", "repos"],
  "10": ["matin", "repos", "matin", "matin", "repos", "matin", "repos"],
  "11": ["soir",  "soir",  "repos", "soir",  "soir",  "soir",  "repos"],
  "15": ["repos", "repos", "matin", "repos", "matin", "matin", "repos"],
  // Bar
  "5":  ["repos", "repos", "soir",  "soir",  "repos", "soir",  "repos"],
  "12": ["matin", "matin", "matin", "repos", "matin", "repos", "repos"],
  "13": ["repos", "soir",  "soir",  "soir",  "repos", "soir",  "repos"],
  // Plonge
  "6":  ["matin", "repos", "matin", "matin", "repos", "matin", "repos"],
  "14": ["soir",  "repos", "soir",  "repos", "soir",  "soir",  "repos"],
  "16": ["repos", "matin", "repos", "matin", "matin", "repos", "repos"],
};

const SHIFT_TIMES: Record<ShiftType, { start: string; end: string }> = {
  matin:     { start: "08:00", end: "16:00" },
  soir:      { start: "18:00", end: "23:00" },
  // conservés pour compatibilité (page équipe, anciens exports)
  ouverture: { start: "07:00", end: "15:00" },
  midi:      { start: "11:00", end: "19:00" },
  fermeture: { start: "19:00", end: "23:00" },
  coupure:   { start: "16:00", end: "18:00" },
  repos:     { start: "",      end: ""      },
};

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().split("T")[0];
}

export function getShiftsForWeek(weekStart: string): Shift[] {
  return employees.flatMap((employee) =>
    WEEK_PATTERNS[employee.id].map((type, day) => ({
      id:         `${employee.id}-${weekStart}-${day}`,
      employeeId: employee.id,
      date:       addDays(weekStart, day),
      type,
      ...SHIFT_TIMES[type],
    }))
  );
}
