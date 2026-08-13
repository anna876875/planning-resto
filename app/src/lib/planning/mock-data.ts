import type { Employee, Shift, ShiftType } from "@/types/planning";

export const employees: Employee[] = [
  { id: "1", name: "Marie Dupont", role: "chef_cuisine" },
  { id: "2", name: "Thomas Laurent", role: "chef_partie" },
  { id: "3", name: "Julie Martin", role: "serveur" },
  { id: "4", name: "Lucas Bernard", role: "serveur" },
  { id: "5", name: "Emma Petit", role: "barman" },
  { id: "6", name: "Nicolas Roux", role: "plongeur" },
];

// Pattern hebdomadaire fixe par employé (lun → dim)
const WEEK_PATTERNS: Record<string, ShiftType[]> = {
  "1": ["matin", "matin", "repos", "matin", "matin", "soir", "repos"],
  "2": ["soir", "matin", "matin", "repos", "soir", "soir", "matin"],
  "3": ["matin", "repos", "soir", "matin", "matin", "coupure", "repos"],
  "4": ["repos", "soir", "matin", "soir", "repos", "matin", "soir"],
  "5": ["soir", "soir", "repos", "coupure", "soir", "repos", "soir"],
  "6": ["matin", "matin", "soir", "matin", "repos", "matin", "matin"],
};

const SHIFT_TIMES: Record<ShiftType, { start: string; end: string }> = {
  matin: { start: "07:00", end: "15:00" },
  soir: { start: "15:00", end: "23:00" },
  coupure: { start: "10:00", end: "23:00" },
  repos: { start: "", end: "" },
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

export function getShiftsForWeek(weekStart: string): Shift[] {
  return employees.flatMap((employee) =>
    WEEK_PATTERNS[employee.id].map((type, day) => ({
      employeeId: employee.id,
      date: addDays(weekStart, day),
      type,
      ...SHIFT_TIMES[type],
    }))
  );
}
