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

// Lun→Dim · Contraintes : max 2 ouvertures par jour, fermeture = arrivée à 19h
const WEEK_PATTERNS: Record<string, ShiftType[]> = {
  // Cuisine
  "1":  ["ouverture", "ouverture", "repos",     "ouverture", "ouverture", "repos",     "repos"], // chef ouverture
  "2":  ["soir",      "soir",      "soir",      "repos",     "soir",      "repos",     "repos"],
  "7":  ["repos",     "midi",      "midi",      "midi",      "repos",     "midi",      "repos"],
  "8":  ["soir",      "repos",     "soir",      "soir",      "soir",      "repos",     "repos"],
  // Salle
  "3":  ["repos",     "midi",      "midi",      "repos",     "midi",      "midi",      "repos"],
  "4":  ["soir",      "soir",      "repos",     "soir",      "soir",      "repos",     "repos"],
  "10": ["midi",      "repos",     "midi",      "midi",      "repos",     "midi",      "repos"],
  "11": ["soir",      "soir",      "repos",     "soir",      "soir",      "soir",      "repos"],
  "15": ["repos",     "repos",     "midi",      "repos",     "soir",      "midi",      "repos"],
  // Bar
  "5":  ["repos",     "repos",     "soir",      "soir",      "repos",     "midi",      "repos"],
  "12": ["midi",      "midi",      "midi",      "repos",     "midi",      "repos",     "repos"],
  "13": ["repos",     "soir",      "soir",      "soir",      "repos",     "soir",      "repos"],
  // Plonge
  "6":  ["ouverture", "repos",     "ouverture", "ouverture", "repos",     "ouverture", "repos"], // plongeur ouverture
  "14": ["soir",      "repos",     "soir",      "repos",     "soir",      "soir",      "repos"],
  "16": ["repos",     "midi",      "repos",     "soir",      "midi",      "repos",     "repos"],
};

const SHIFT_TIMES: Record<ShiftType, { start: string; end: string }> = {
  ouverture: { start: "07:00", end: "15:00" },
  midi:      { start: "11:00", end: "19:00" },
  soir:      { start: "15:00", end: "23:00" },
  fermeture: { start: "19:00", end: "23:00" },
  matin:     { start: "07:00", end: "15:00" }, // conservé pour compatibilité
  coupure:   { start: "10:00", end: "23:00" }, // conservé pour page équipe
  repos:     { start: "",      end: ""      },
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
