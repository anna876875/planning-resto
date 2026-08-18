export function getWeekMonday(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  r.setHours(0, 0, 0, 0);
  return r;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function toYMD(d: Date): string {
  return d.toISOString().split("T")[0];
}

export const SERVICE_COLORS = {
  matin:   { dot: "bg-blue-400",   chip: "bg-blue-50 text-blue-800",     pill: "bg-blue-100 text-blue-700",   header: "border-blue-200 bg-blue-50 text-blue-800",     label: "Matin",   hours: "07:00 – 15:00" },
  coupure: { dot: "bg-amber-400",  chip: "bg-amber-50 text-amber-800",   pill: "bg-amber-100 text-amber-700", header: "border-amber-200 bg-amber-50 text-amber-800",   label: "Coupure", hours: "10:00 – 23:00" },
  soir:    { dot: "bg-violet-400", chip: "bg-violet-50 text-violet-800", pill: "bg-violet-100 text-violet-700",header: "border-violet-200 bg-violet-50 text-violet-800",label: "Soir",    hours: "15:00 – 23:00" },
} as const;
