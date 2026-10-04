import type { Employee, Shift, ShiftType } from "@/types/planning";

// Absences relatives à la semaine du 06/10/2026 (prochaine semaine depuis aujourd'hui)
export const employees: Employee[] = [
  // ── Cuisine (4) ──────────────────────────────────────────────────────────
  {
    id: "1",
    name: "Marie Dupont",
    role: "chef_cuisine",
    heuresContratHebdo: 39,
    absences: [
      { id: "a1", dateDebut: "2026-10-06", dateFin: "2026-10-09", type: "conge", valide: true },
    ],
  },
  {
    id: "2",
    name: "Thomas Laurent",
    role: "chef_partie",
    heuresContratHebdo: 39,
    absences: [
      { id: "a2", dateDebut: "2026-10-10", dateFin: "2026-10-10", type: "maladie", valide: true },
    ],
  },
  { id: "7", name: "Sophie Moreau", role: "chef_cuisine", heuresContratHebdo: 39 },
  { id: "8", name: "Antoine Lefèvre", role: "chef_partie", heuresContratHebdo: 39 },

  // ── Salle (5) ─────────────────────────────────────────────────────────────
  { id: "3", name: "Julie Martin", role: "serveur", heuresContratHebdo: 35 },
  {
    id: "4",
    name: "Lucas Bernard",
    role: "serveur",
    heuresContratHebdo: 35,
    absences: [
      { id: "a3", dateDebut: "2026-10-13", dateFin: "2026-10-17", type: "conge", valide: true },
    ],
  },
  { id: "10", name: "Camille Blanc", role: "serveur", heuresContratHebdo: 35 },
  { id: "11", name: "Hugo Dubois", role: "serveur", heuresContratHebdo: 35 },
  {
    id: "15",
    name: "Inès Fontaine",
    role: "serveur",
    heuresContratHebdo: 28,
    // Disponible uniquement Lun, Mar, Jeu, Sam
    disponibilites: { 1: ["matin", "soir"], 2: ["matin", "soir"], 4: ["matin", "soir"], 6: ["matin", "soir"] },
  },

  // ── Bar (3) ───────────────────────────────────────────────────────────────
  {
    id: "5",
    name: "Emma Petit",
    role: "barman",
    heuresContratHebdo: 35,
    absences: [
      { id: "a4", dateDebut: "2026-10-20", dateFin: "2026-10-24", type: "conge", valide: true },
    ],
  },
  { id: "12", name: "Léa Simon", role: "barman", heuresContratHebdo: 35 },
  {
    id: "13",
    name: "Maxime Durand",
    role: "barman",
    heuresContratHebdo: 28,
    // Disponible mer soir, jeu soir, ven, sam
    disponibilites: { 3: ["soir"], 4: ["soir"], 5: ["matin", "soir"], 6: ["matin", "soir"] },
  },

  // ── Plonge (3) ────────────────────────────────────────────────────────────
  {
    id: "6",
    name: "Nicolas Roux",
    role: "plongeur",
    heuresContratHebdo: 25,
    disponibilites: { 1: ["matin"], 2: ["matin"], 3: ["matin"], 4: ["matin"], 5: ["matin"] },
  },
  {
    id: "14",
    name: "Kevin Martin",
    role: "plongeur",
    heuresContratHebdo: 25,
    disponibilites: { 1: ["soir"], 2: ["soir"], 3: ["soir"], 4: ["soir"], 5: ["soir"], 6: ["soir"] },
  },
  { id: "16", name: "Yasmine Chabane", role: "plongeur", heuresContratHebdo: 25 },
];

// Lun→Dim · 2 services : matin (08-16) et soir (18-23)
const WEEK_PATTERNS: Record<string, ShiftType[]> = {
  // Cuisine
  "1": ["matin", "matin", "repos", "matin", "matin", "repos", "repos"],
  "2": ["soir", "soir", "soir", "repos", "soir", "repos", "repos"],
  "7": ["repos", "matin", "matin", "matin", "repos", "matin", "repos"],
  "8": ["soir", "repos", "soir", "soir", "soir", "repos", "repos"],
  // Salle
  "3": ["repos", "matin", "matin", "repos", "matin", "matin", "repos"],
  "4": ["soir", "soir", "repos", "soir", "soir", "repos", "repos"],
  "10": ["matin", "repos", "matin", "matin", "repos", "matin", "repos"],
  "11": ["soir", "soir", "repos", "soir", "soir", "soir", "repos"],
  "15": ["repos", "repos", "matin", "repos", "matin", "matin", "repos"],
  // Bar
  "5": ["repos", "repos", "soir", "soir", "repos", "soir", "repos"],
  "12": ["matin", "matin", "matin", "repos", "matin", "repos", "repos"],
  "13": ["repos", "soir", "soir", "soir", "repos", "soir", "repos"],
  // Plonge
  "6": ["matin", "repos", "matin", "matin", "repos", "matin", "repos"],
  "14": ["soir", "repos", "soir", "repos", "soir", "soir", "repos"],
  "16": ["repos", "matin", "repos", "matin", "matin", "repos", "repos"],
};

const SHIFT_TIMES: Record<ShiftType, { start: string; end: string }> = {
  matin:     { start: "08:00", end: "16:00" },
  soir:      { start: "18:00", end: "23:00" },
  ouverture: { start: "07:00", end: "15:00" },
  midi:      { start: "11:00", end: "19:00" },
  fermeture: { start: "19:00", end: "23:00" },
  coupure:   { start: "16:00", end: "18:00" },
  repos:     { start: "", end: "" },
  conge:     { start: "", end: "" },
};

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().split("T")[0];
}

function isAbsentOnDay(emp: Employee, dateStr: string): boolean {
  return (
    emp.absences?.some(
      (a) => a.valide && dateStr >= a.dateDebut && dateStr <= a.dateFin
    ) ?? false
  );
}

export function getShiftsForWeek(weekStart: string): Shift[] {
  return employees.flatMap((employee) =>
    WEEK_PATTERNS[employee.id].map((patternType, day) => {
      const date = addDays(weekStart, day);
      const absent = isAbsentOnDay(employee, date);
      const type: ShiftType = absent ? "conge" : patternType;
      return {
        id: `${employee.id}-${weekStart}-${day}`,
        employeeId: employee.id,
        date,
        type,
        ...SHIFT_TIMES[type],
      };
    })
  );
}
