"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search, Plus, AlertCircle, Users, LayoutGrid, List, Clock,
  Mail, Phone, CalendarOff, Repeat2, TrendingUp, X, CalendarDays,
  Pencil, Check, Trash2, UsersRound, Camera, Upload, Loader2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { equipe, type ContratType, type StatutEmploye, type AlerteType, type EmployeDetail, type IndispoHebdo } from "@/lib/planning/mock-equipe";

// ─── Config ───────────────────────────────────────────────────────────────────

const CONTRAT_CFG: Record<ContratType, { label: string; color: string }> = {
  CDI:           { label: "CDI",          color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  CDD:           { label: "CDD",          color: "text-blue-700    bg-blue-50    border-blue-200"    },
  temps_partiel: { label: "Temps partiel",color: "text-violet-700  bg-violet-50  border-violet-200"  },
  extra:         { label: "Extra",        color: "text-amber-700   bg-amber-50   border-amber-200"   },
};

const STATUT_CFG: Record<StatutEmploye, { label: string; dot: string; badge: string }> = {
  actif:         { label: "Actif",         dot: "bg-emerald-500", badge: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  congé:         { label: "En congé",      dot: "bg-amber-400",   badge: "text-amber-700   bg-amber-50   border-amber-200"   },
  arrêt_maladie: { label: "Arrêt maladie", dot: "bg-red-400",     badge: "text-red-700     bg-red-50     border-red-200"     },
};

const ALERTE_CFG: Record<AlerteType, { Icon: React.ElementType; color: string }> = {
  weekends_consecutifs: { Icon: Repeat2,    color: "text-amber-700  bg-amber-50  border-amber-200" },
  heures_sup:           { Icon: TrendingUp, color: "text-amber-700  bg-amber-50  border-amber-200" },
  jours_consecutifs:    { Icon: CalendarOff,color: "text-amber-700  bg-amber-50  border-amber-200" },
};

const JOURS_FULL = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"] as const;

const SERVICE_HORAIRES: Record<string, { label: string; debut: string; fin: string; duree: string }> = {
  matin:   { label: "Matin",   debut: "07:00", fin: "15:00", duree: "8h" },
  soir:    { label: "Soir",    debut: "15:00", fin: "23:00", duree: "8h" },
  coupure: { label: "Coupure", debut: "10:00", fin: "23:00", duree: "9h" },
};

function getLundiSemaine(): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getSemaineEmployee(joursTravail: string[], services: string[]) {
  const lundi = getLundiSemaine();
  const serviceRef = services[0] ?? "matin";
  return JOURS_FULL.map((jour, i) => {
    const date = new Date(lundi);
    date.setDate(lundi.getDate() + i);
    const travaille = joursTravail.includes(jour);
    const horaire = travaille ? SERVICE_HORAIRES[serviceRef] : null;
    return { jour, date, travaille, horaire };
  });
}

const AVATAR_CLS = "bg-primary/10 text-primary";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
function avatarCls() { return AVATAR_CLS; }

// ─── Sous-composants ──────────────────────────────────────────────────────────

function AlertesBadges({ alertes }: { alertes: NonNullable<EmployeDetail["alertes"]> }) {
  return (
    <div className="flex flex-wrap gap-1">
      {alertes.map((a, i) => {
        const { Icon, color } = ALERTE_CFG[a.type];
        return (
          <span key={i} className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", color)}>
            <Icon className="h-2.5 w-2.5" /> {a.label}
          </span>
        );
      })}
    </div>
  );
}

// ─── Champ de formulaire ──────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">{label}</p>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = "text", placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="border-border bg-muted/30 focus:ring-primary/30 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
    />
  );
}

// ─── Indicateurs planning ─────────────────────────────────────────────────────

const SEMAINE = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

function maxReposConsecutifs(joursTravail: string[]): number {
  const repos = SEMAINE.map(j => !joursTravail.includes(j));
  const doubled = [...repos, ...repos];
  let max = 0, curr = 0;
  for (const r of doubled) {
    if (r) { curr++; max = Math.max(max, curr); }
    else curr = 0;
  }
  return Math.min(max, repos.filter(Boolean).length);
}

function weekendsReposCeMois(joursTravail: string[]): number {
  if (joursTravail.includes("Sam") || joursTravail.includes("Dim")) return 0;
  const now = new Date();
  const debut = new Date(now.getFullYear(), now.getMonth(), 1);
  const fin   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  let count = 0;
  const d = new Date(debut);
  while (d <= fin) {
    if (d.getDay() === 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

// ─── Panel détail ─────────────────────────────────────────────────────────────

type Draft = Pick<EmployeDetail, "email" | "telephone" | "indisponibilites">;
const EMPTY_INDISPO = { debut: "", fin: "", motif: "" };

function DetailPanel({ emp, onClose, onSave }: {
  emp: EmployeDetail | null;
  onClose: () => void;
  onSave: (id: string, patch: Draft) => void;
}) {
  const open = emp !== null;

  const [editing, setEditing]         = useState(false);
  const [draft, setDraft]             = useState<Draft>({ email: "", telephone: "", indisponibilites: [] });
  const [newIndispo, setNewIndispo]    = useState(EMPTY_INDISPO);
  const [addingIndispo, setAddingIndispo] = useState(false);

  function resetDraft(e: EmployeDetail) {
    setDraft({ email: e.email, telephone: e.telephone, indisponibilites: [...(e.indisponibilites ?? [])] });
    setEditing(false);
    setAddingIndispo(false);
    setNewIndispo(EMPTY_INDISPO);
  }

  useEffect(() => { if (emp) resetDraft(emp); }, [emp?.id]); // sync quand l'employé change

  function handleSave() {
    if (!emp) return;
    onSave(emp.id, draft);
    setEditing(false);
    setAddingIndispo(false);
  }

  function handleCancel() {
    if (emp) resetDraft(emp);
  }

  function removeIndispo(i: number) {
    setDraft(d => ({ ...d, indisponibilites: d.indisponibilites!.filter((_, idx) => idx !== i) }));
  }

  function confirmIndispo() {
    if (!newIndispo.debut) return;
    setDraft(d => ({ ...d, indisponibilites: [...(d.indisponibilites ?? []), { ...newIndispo, fin: newIndispo.fin || undefined, motif: newIndispo.motif || undefined }] }));
    setNewIndispo(EMPTY_INDISPO);
    setAddingIndispo(false);
  }

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/30 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />
      <div
        className="fixed top-0 right-0 z-50 flex h-full w-[min(560px,100vw)] flex-col bg-background shadow-2xl transition-transform duration-300 ease-in-out"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        {emp && (
          <>
            {/* Header */}
            <div className="border-border flex h-14 shrink-0 items-center gap-3 border-b px-4">
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold", avatarCls())}>
                {emp.nom.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{emp.nom}</p>
                <p className="text-muted-foreground truncate text-xs">{emp.poste}</p>
              </div>
              <div className="flex items-center gap-1">
                {editing ? (
                  <>
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleCancel}>Annuler</Button>
                    <Button size="sm" className="h-8 text-xs" onClick={handleSave}>
                      <Check className="mr-1 h-3 w-3" /> Enregistrer
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(true)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 divide-y divide-border overflow-y-auto">

              {/* Infos principales */}
              <div className="space-y-4 px-4 py-4">
                {/* Statut + contrat */}
                <div className="flex flex-wrap gap-2">
                  {(() => { const s = STATUT_CFG[emp.statut]; return (
                    <span className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", s.badge)}>
                      <span className={cn("h-2 w-2 rounded-full", s.dot)} /> {s.label}
                    </span>
                  ); })()}
                  {(() => { const c = CONTRAT_CFG[emp.contrat]; return (
                    <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", c.color)}>{c.label}</span>
                  ); })()}
                  {emp.dateFinCDD && (
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      Fin {new Date(emp.dateFinCDD).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" })}
                    </span>
                  )}
                </div>

                {/* Heures */}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold">{emp.heuresReelles ?? emp.heuresHebdo}</span>
                  <span className="text-muted-foreground text-sm">h réalisées</span>
                  {emp.heuresReelles && emp.heuresReelles !== emp.heuresHebdo && (
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold",
                      emp.heuresReelles > emp.heuresHebdo ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-600"
                    )}>
                      {emp.heuresReelles > emp.heuresHebdo ? "+" : ""}{emp.heuresReelles - emp.heuresHebdo}h
                    </span>
                  )}
                </div>

                {/* Aperçu jours travaillés */}
                {emp.joursTravail.length > 0 && (
                  <div className="border-border overflow-hidden rounded-md border">
                    <table className="w-full border-collapse text-xs">
                      <tbody className="divide-border divide-y">
                        {emp.joursTravail.map(jour => {
                          const sKey = emp.services[0] ?? "matin";
                          const h = SERVICE_HORAIRES[sKey];
                          return (
                            <tr key={jour}>
                              <td className="w-10 py-1.5 pl-3 font-semibold">{jour}</td>
                              <td className="px-2 py-1.5">
                                {h && (
                                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold",
                                    sKey === "matin"   && "bg-blue-50   text-blue-700",
                                    sKey === "soir"    && "bg-violet-50 text-violet-700",
                                    sKey === "coupure" && "bg-teal-50   text-teal-700",
                                  )}>{h.label}</span>
                                )}
                              </td>
                              <td className="py-1.5 pr-3 text-right text-muted-foreground">
                                {h ? <>{h.debut} – {h.fin} <span className="font-semibold text-foreground">· {h.duree}</span></> : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Indicateurs du mois */}
                {emp.joursTravail.length > 0 && (() => {
                  const reposMax    = maxReposConsecutifs(emp.joursTravail);
                  const wkRepos     = weekendsReposCeMois(emp.joursTravail);
                  const lowRepos    = reposMax <= 2;
                  const noWeekend   = wkRepos === 0;
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      <div className={cn("rounded-md border px-3 py-2.5", noWeekend ? "border-amber-200 bg-amber-50/60" : "border-border")}>
                        <div className="flex items-center gap-1.5">
                          <CalendarOff className={cn("h-3 w-3", noWeekend ? "text-amber-500" : "text-muted-foreground")} />
                          <p className={cn("text-[10px] font-semibold uppercase tracking-widest", noWeekend ? "text-amber-600" : "text-muted-foreground")}>
                            Weekends repos
                          </p>
                        </div>
                        <p className={cn("mt-1 text-xl font-bold", noWeekend && "text-amber-700")}>{wkRepos}</p>
                        <p className={cn("text-[10px]", noWeekend ? "text-amber-600" : "text-muted-foreground")}>
                          {noWeekend ? "aucun ce mois-ci" : `ce mois-ci`}
                        </p>
                      </div>
                      <div className={cn("rounded-md border px-3 py-2.5", lowRepos ? "border-amber-200 bg-amber-50/60" : "border-border")}>
                        <div className="flex items-center gap-1.5">
                          <Clock className={cn("h-3 w-3", lowRepos ? "text-amber-500" : "text-muted-foreground")} />
                          <p className={cn("text-[10px] font-semibold uppercase tracking-widest", lowRepos ? "text-amber-600" : "text-muted-foreground")}>
                            Repos consécutifs
                          </p>
                        </div>
                        <p className={cn("mt-1 text-xl font-bold", lowRepos && "text-amber-700")}>{reposMax}</p>
                        <p className={cn("text-[10px]", lowRepos ? "text-amber-600" : "text-muted-foreground")}>
                          {lowRepos ? `seulement ${reposMax}j max` : `jours max`}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* CTA */}
                <button type="button" className="text-primary text-xs hover:underline underline-offset-2">
                  Voir toutes les heures →
                </button>

                {/* Alertes */}
                {(emp.alertes?.length ?? 0) > 0 && (
                  <AlertesBadges alertes={emp.alertes!} />
                )}

                {emp.note && <p className="text-muted-foreground text-xs italic">{emp.note}</p>}
              </div>

              {/* Contact — lecture ou édition */}
              <div className="px-4 py-4 space-y-3">
                <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">Contact</p>
                {editing ? (
                  <>
                    <Field label="Email">
                      <Input value={draft.email} onChange={v => setDraft(d => ({ ...d, email: v }))} type="email" placeholder="email@restaurant.fr" />
                    </Field>
                    <Field label="Téléphone">
                      <Input value={draft.telephone} onChange={v => setDraft(d => ({ ...d, telephone: v }))} placeholder="06 xx xx xx xx" />
                    </Field>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <a href={`mailto:${emp.email}`} className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors">
                      <Mail className="h-4 w-4 shrink-0" /> {emp.email}
                    </a>
                    <a href={`tel:${emp.telephone}`} className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors">
                      <Phone className="h-4 w-4 shrink-0" /> {emp.telephone}
                    </a>
                  </div>
                )}
              </div>

              {/* Indisponibilités — lecture ou édition */}
              <div className="px-4 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">Indisponibilités</p>
                  {editing && !addingIndispo && (
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setAddingIndispo(true)}>
                      <Plus className="h-3 w-3" /> Ajouter
                    </Button>
                  )}
                </div>

                {/* Récurrentes hebdomadaires (lecture seule) */}
                {(emp.indisposHebdo?.length ?? 0) > 0 && (
                  <div className="mb-3 space-y-1.5">
                    <p className="text-muted-foreground text-[10px] font-medium">Récurrentes</p>
                    {emp.indisposHebdo!.map((ind, i) => (
                      <div key={`h${i}`} className="border-border flex items-start gap-2.5 rounded-md border px-3 py-2">
                        <Repeat2 className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold">
                            {ind.jours.join(", ")}
                            {ind.heureDebut && ind.heureFin && ` · ${ind.heureDebut} – ${ind.heureFin}`}
                          </p>
                          {ind.motif && <p className="text-muted-foreground text-[11px]">{ind.motif}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Liste */}
                <div className="space-y-1.5">
                  {(editing ? draft.indisponibilites : emp.indisponibilites)?.map((ind, i) => (
                    <div key={i} className="border-border flex items-start gap-2.5 rounded-md border px-3 py-2">
                      <CalendarDays className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold">
                          {fmtDate(ind.debut)}{ind.fin && ` → ${fmtDate(ind.fin)}`}
                        </p>
                        {ind.motif && <p className="text-muted-foreground text-[11px]">{ind.motif}</p>}
                      </div>
                      {editing && (
                        <button type="button" onClick={() => removeIndispo(i)} className="text-muted-foreground hover:text-red-500 mt-0.5 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!editing && !emp.indisponibilites?.length && !emp.indisposHebdo?.length && (
                    <p className="text-muted-foreground text-xs">Aucune.</p>
                  )}
                  {editing && !draft.indisponibilites?.length && !addingIndispo && (
                    <p className="text-muted-foreground text-xs">Aucune déclarée.</p>
                  )}
                </div>

                {/* Formulaire ajout */}
                {addingIndispo && (
                  <div className="border-border mt-3 space-y-2 rounded-md border bg-muted/20 p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Début">
                        <Input type="date" value={newIndispo.debut} onChange={v => setNewIndispo(n => ({ ...n, debut: v }))} />
                      </Field>
                      <Field label="Fin (optionnel)">
                        <Input type="date" value={newIndispo.fin} onChange={v => setNewIndispo(n => ({ ...n, fin: v }))} />
                      </Field>
                    </div>
                    <Field label="Motif (optionnel)">
                      <Input value={newIndispo.motif} onChange={v => setNewIndispo(n => ({ ...n, motif: v }))} placeholder="Ex : mariage, rendez-vous…" />
                    </Field>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setAddingIndispo(false); setNewIndispo(EMPTY_INDISPO); }}>
                        Annuler
                      </Button>
                      <Button size="sm" className="h-7 text-xs" onClick={confirmIndispo} disabled={!newIndispo.debut}>
                        Confirmer
                      </Button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Groupes / équipes ────────────────────────────────────────────────────────

interface EquipeGroupe {
  id: string;
  nom: string;
  saison?: string;
  membreIds: string[];
}

const INITIAL_GROUPES: EquipeGroupe[] = [];

// ─── Ajouter un employé ───────────────────────────────────────────────────────

const POSTES_SUGGESTIONS = [
  "Chef de cuisine", "Chef de partie", "Cuisinier", "Commis de cuisine",
  "Serveur", "Serveuse", "Chef de rang", "Maître d'hôtel",
  "Barmaid", "Barman", "Plongeur", "Plongeuse",
];

const JOURS_OPTIONS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

type IndispoFormEntry = { jours: string[]; heureDebut: string; heureFin: string; motif: string };
const EMPTY_INDISPO_FORM: IndispoFormEntry = { jours: [], heureDebut: "", heureFin: "", motif: "" };

type EmpForm = {
  nom: string; poste: string; email: string; telephone: string;
  contrat: ContratType; heuresHebdo: number;
  dateDebut: string; dateFinCDD: string;
  note: string;
  indisposHebdo: IndispoFormEntry[];
};

const EMPTY_EMP: EmpForm = {
  nom: "", poste: "", email: "", telephone: "",
  contrat: "CDI", heuresHebdo: 35,
  dateDebut: "", dateFinCDD: "",
  note: "",
  indisposHebdo: [],
};

function AjouterEmployeModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (emp: EmployeDetail) => void;
}) {
  const [step, setStep]             = useState<"choix" | "scan" | "form">("choix");
  const [form, setForm]             = useState<EmpForm>(EMPTY_EMP);
  const [preview, setPreview]       = useState<string | null>(null);
  const [analyzing, setAnalyzing]   = useState(false);
  const [scanError, setScanError]   = useState<string | null>(null);
  const [addingIndispo, setAddingIndispo] = useState(false);
  const [newIndispo, setNewIndispo]       = useState<IndispoFormEntry>(EMPTY_INDISPO_FORM);
  const fileRef                     = useRef<HTMLInputElement>(null);

  function set<K extends keyof EmpForm>(k: K, v: EmpForm[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }
  function toggleIndispoJour(jour: string) {
    setNewIndispo(n => ({
      ...n,
      jours: n.jours.includes(jour) ? n.jours.filter(j => j !== jour) : [...n.jours, jour],
    }));
  }
  function confirmIndispo() {
    if (newIndispo.jours.length === 0) return;
    setForm(f => ({ ...f, indisposHebdo: [...f.indisposHebdo, { ...newIndispo }] }));
    setNewIndispo(EMPTY_INDISPO_FORM);
    setAddingIndispo(false);
  }

  async function processFile(file: File) {
    const dataUrl = await new Promise<string>((res) => {
      const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file);
    });
    setPreview(dataUrl);
    setAnalyzing(true);
    setScanError(null);
    try {
      const res = await fetch("/api/parse-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl.split(",")[1], mimeType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setForm(f => ({
        ...f,
        nom:         data.nom         ?? f.nom,
        poste:       data.poste       ?? f.poste,
        email:       data.email       ?? f.email,
        telephone:   data.telephone   ?? f.telephone,
        contrat:     data.contrat     ?? f.contrat,
        heuresHebdo: data.heuresHebdo ?? f.heuresHebdo,
        dateDebut:   data.dateDebut   ?? f.dateDebut,
        dateFinCDD:  data.dateFinCDD  ?? f.dateFinCDD,
      }));
      setStep("form");
    } catch (e: unknown) {
      setScanError(e instanceof Error ? e.message : "Impossible d'analyser le document.");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function canSubmit() { return form.nom.trim().length > 0 && form.poste.trim().length > 0; }

  function submit() {
    if (!canSubmit()) return;
    onAdd({
      id: crypto.randomUUID(),
      nom: form.nom.trim(),
      poste: form.poste.trim(),
      email: form.email.trim(),
      telephone: form.telephone.trim(),
      contrat: form.contrat,
      heuresHebdo: form.heuresHebdo,
      dateDebut: form.dateDebut || new Date().toISOString().split("T")[0],
      dateFinCDD: form.contrat === "CDD" && form.dateFinCDD ? form.dateFinCDD : undefined,
      joursTravail: [],
      services: [],
      statut: "actif",
      note: form.note.trim() || undefined,
      indisposHebdo: form.indisposHebdo.length > 0
        ? form.indisposHebdo.map(i => ({
            jours: i.jours as IndispoHebdo["jours"],
            heureDebut: i.heureDebut || undefined,
            heureFin: i.heureFin || undefined,
            motif: i.motif || undefined,
          }))
        : undefined,
    });
    onClose();
  }

  const STEP_TITLE = { choix: "Ajouter un employé", scan: "Scanner un document", form: "Fiche employé" };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 z-[60] flex w-[min(520px,92vw)] max-h-[82vh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-background shadow-2xl">

        {/* Header */}
        <div className="border-border flex h-12 shrink-0 items-center justify-between border-b px-4">
          <h2 className="text-sm font-semibold">{STEP_TITLE[step]}</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Choix de méthode ── */}
        {step === "choix" && (
          <div className="flex flex-col gap-4 p-6">
            <p className="text-muted-foreground text-sm">Comment souhaitez-vous ajouter cet employé ?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStep("scan")}
                className="border-border hover:border-primary hover:bg-primary/5 flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-colors"
              >
                <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
                  <Camera className="text-primary h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Scanner un document</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">CV ou contrat de travail</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setStep("form")}
                className="border-border hover:border-primary hover:bg-primary/5 flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-colors"
              >
                <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
                  <Pencil className="text-primary h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Saisie manuelle</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">Remplir le formulaire</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── Scanner ── */}
        {step === "scan" && (
          <div className="flex flex-col gap-4 p-6">
            {analyzing ? (
              <div className="flex flex-col items-center gap-4 py-10">
                <Loader2 className="text-primary h-10 w-10 animate-spin" />
                <div className="text-center">
                  <p className="font-medium">Lecture du document…</p>
                  <p className="text-muted-foreground mt-1 text-sm">L'IA extrait les informations de l'employé.</p>
                </div>
              </div>
            ) : preview ? (
              <div className="space-y-3">
                <img src={preview} alt="Document scanné" className="max-h-52 w-full rounded-lg object-contain" />
                {scanError && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{scanError}</p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setPreview(null); setScanError(null); if (fileRef.current) fileRef.current.value = ""; }}>
                    Réessayer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Zone drop / import */}
                <label
                  htmlFor="scan-import"
                  className="border-border hover:border-primary hover:bg-primary/5 flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors"
                >
                  <Upload className="text-muted-foreground h-8 w-8" />
                  <div>
                    <p className="text-sm font-medium">Importer un fichier</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">JPG, PNG, WebP — CV ou contrat</p>
                  </div>
                </label>
                <input id="scan-import" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileInput} />

                {/* Bouton caméra (mobile : ouvre l'appareil photo) */}
                <label
                  htmlFor="scan-camera"
                  className="border-border hover:border-primary hover:bg-primary/5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
                >
                  <Camera className="h-4 w-4" /> Prendre en photo
                </label>
                <input id="scan-camera" type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInput} />

                {scanError && <p className="text-sm text-red-600">{scanError}</p>}
              </div>
            )}
          </div>
        )}

        {/* ── Formulaire ── */}
        {step === "form" && (
          <>
            {preview && (
              <div className="border-border flex items-center gap-2 border-b bg-emerald-50 px-4 py-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-xs text-emerald-700">Informations extraites — vérifiez et complétez si nécessaire.</p>
              </div>
            )}

            <div className="flex-1 space-y-5 overflow-y-auto p-4">

              {/* Identité */}
              <div className="space-y-3">
                <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">Identité</p>
                <Field label="Nom complet *">
                  <Input value={form.nom} onChange={v => set("nom", v)} placeholder="Prénom Nom" />
                </Field>
                <Field label="Poste *">
                  <input
                    list="postes-list"
                    value={form.poste}
                    onChange={e => set("poste", e.target.value)}
                    placeholder="Ex : Chef de partie"
                    className="border-border bg-muted/30 focus:ring-primary/30 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
                  />
                  <datalist id="postes-list">
                    {POSTES_SUGGESTIONS.map(p => <option key={p} value={p} />)}
                  </datalist>
                </Field>
              </div>

              {/* Contrat */}
              <div className="space-y-3">
                <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">Contrat</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["CDI", "CDD", "temps_partiel", "extra"] as ContratType[]).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set("contrat", c)}
                      className={cn(
                        "rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors",
                        form.contrat === c
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {CONTRAT_CFG[c].label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Heures / sem.">
                    <Input type="number" value={String(form.heuresHebdo)} onChange={v => set("heuresHebdo", Number(v))} placeholder="35" />
                  </Field>
                  <Field label="Date de début">
                    <Input type="date" value={form.dateDebut} onChange={v => set("dateDebut", v)} />
                  </Field>
                </div>
                {form.contrat === "CDD" && (
                  <Field label="Date de fin de contrat">
                    <Input type="date" value={form.dateFinCDD} onChange={v => set("dateFinCDD", v)} />
                  </Field>
                )}
              </div>

              {/* Contact */}
              <div className="space-y-3">
                <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">Contact</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Email">
                    <Input type="email" value={form.email} onChange={v => set("email", v)} placeholder="prenom@restaurant.fr" />
                  </Field>
                  <Field label="Téléphone">
                    <Input value={form.telephone} onChange={v => set("telephone", v)} placeholder="06 xx xx xx xx" />
                  </Field>
                </div>
              </div>

              {/* Indisponibilités récurrentes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">Indisponibilités</p>
                  {!addingIndispo && (
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setAddingIndispo(true)}>
                      <Plus className="h-3 w-3" /> Ajouter
                    </Button>
                  )}
                </div>

                {form.indisposHebdo.length === 0 && !addingIndispo && (
                  <p className="text-muted-foreground text-xs">Aucune pour l'instant.</p>
                )}

                {form.indisposHebdo.map((ind, i) => (
                  <div key={i} className="border-border flex items-start gap-2.5 rounded-md border px-3 py-2">
                    <Repeat2 className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold">
                        {ind.jours.join(", ")}
                        {ind.heureDebut && ind.heureFin && ` · ${ind.heureDebut} – ${ind.heureFin}`}
                      </p>
                      {ind.motif && <p className="text-muted-foreground text-[11px]">{ind.motif}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, indisposHebdo: f.indisposHebdo.filter((_, idx) => idx !== i) }))}
                      className="text-muted-foreground hover:text-red-500 mt-0.5 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {addingIndispo && (
                  <div className="border-border space-y-3 rounded-md border bg-muted/20 p-3">
                    <Field label="Jours d'absence">
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {JOURS_OPTIONS.map(j => (
                          <button
                            key={j}
                            type="button"
                            onClick={() => toggleIndispoJour(j)}
                            className={cn(
                              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                              newIndispo.jours.includes(j)
                                ? "bg-primary text-primary-foreground"
                                : "border-border border text-muted-foreground hover:border-primary/50"
                            )}
                          >
                            {j}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="De (optionnel)">
                        <Input type="time" value={newIndispo.heureDebut} onChange={v => setNewIndispo(n => ({ ...n, heureDebut: v }))} />
                      </Field>
                      <Field label="À (optionnel)">
                        <Input type="time" value={newIndispo.heureFin} onChange={v => setNewIndispo(n => ({ ...n, heureFin: v }))} />
                      </Field>
                    </div>
                    <Field label="Motif (optionnel)">
                      <Input value={newIndispo.motif} onChange={v => setNewIndispo(n => ({ ...n, motif: v }))} placeholder="Ex : cours, rendez-vous médical…" />
                    </Field>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setAddingIndispo(false); setNewIndispo(EMPTY_INDISPO_FORM); }}>
                        Annuler
                      </Button>
                      <Button size="sm" className="h-7 text-xs" onClick={confirmIndispo} disabled={newIndispo.jours.length === 0}>
                        Confirmer
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Note */}
              <Field label="Note (optionnel)">
                <textarea
                  value={form.note}
                  onChange={e => set("note", e.target.value)}
                  rows={2}
                  placeholder="Remarques, particularités…"
                  className="border-border bg-muted/30 focus:ring-primary/30 w-full resize-none rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
                />
              </Field>
            </div>

            {/* Footer */}
            <div className="border-border flex shrink-0 justify-end gap-2 border-t px-4 py-3">
              <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
              <Button size="sm" onClick={submit} disabled={!canSubmit()}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Ajouter l'employé
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Groupes / équipes ────────────────────────────────────────────────────────

function EquipesModal({ team, onClose }: { team: EmployeDetail[]; onClose: () => void }) {
  const [groupes, setGroupes]       = useState<EquipeGroupe[]>(INITIAL_GROUPES);
  const [editId, setEditId]         = useState<string | "new" | null>(null);
  const [formNom, setFormNom]       = useState("");
  const [formSaison, setFormSaison] = useState("");
  const [formIds, setFormIds]       = useState<Set<string>>(new Set());

  function openNew() {
    setEditId("new");
    setFormNom(""); setFormSaison(""); setFormIds(new Set());
  }

  function openEdit(g: EquipeGroupe) {
    setEditId(g.id);
    setFormNom(g.nom); setFormSaison(g.saison ?? ""); setFormIds(new Set(g.membreIds));
  }

  function cancelEdit() { setEditId(null); }

  function saveGroupe() {
    if (!formNom.trim()) return;
    if (editId === "new") {
      setGroupes(prev => [...prev, { id: `g${Date.now()}`, nom: formNom.trim(), saison: formSaison.trim() || undefined, membreIds: [...formIds] }]);
    } else {
      setGroupes(prev => prev.map(g => g.id === editId ? { ...g, nom: formNom.trim(), saison: formSaison.trim() || undefined, membreIds: [...formIds] } : g));
    }
    setEditId(null);
  }

  function deleteGroupe(id: string) { setGroupes(prev => prev.filter(g => g.id !== id)); }

  function toggleMembre(id: string) {
    setFormIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 z-[60] flex w-[min(520px,92vw)] max-h-[82vh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-background shadow-2xl">
        {/* Header */}
        <div className="border-border flex h-13 shrink-0 items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <UsersRound className="text-primary h-4 w-4" />
            <h2 className="text-sm font-semibold">Équipes</h2>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">

          {/* Liste des groupes */}
          {groupes.map(g => (
            <div key={g.id} className="border-border rounded-md border">
              {editId === g.id ? (
                /* ── Formulaire édition ── */
                <GroupeForm
                  nom={formNom} setNom={setFormNom}
                  saison={formSaison} setSaison={setFormSaison}
                  formIds={formIds} toggleMembre={toggleMembre}
                  team={team} onSave={saveGroupe} onCancel={cancelEdit}
                />
              ) : (
                /* ── Lecture ── */
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{g.nom}</p>
                      {g.saison && <span className="text-muted-foreground rounded border px-1.5 py-0.5 text-[10px]">{g.saison}</span>}
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">{g.membreIds.length} membre{g.membreIds.length > 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(g)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => deleteGroupe(g.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {groupes.length === 0 && editId !== "new" && (
            <p className="text-muted-foreground py-4 text-center text-sm">Aucune équipe définie.</p>
          )}

          {/* Formulaire nouvelle équipe */}
          {editId === "new" && (
            <div className="border-border rounded-md border">
              <GroupeForm
                nom={formNom} setNom={setFormNom}
                saison={formSaison} setSaison={setFormSaison}
                formIds={formIds} toggleMembre={toggleMembre}
                team={team} onSave={saveGroupe} onCancel={cancelEdit}
              />
            </div>
          )}

          {/* Bouton créer */}
          {editId === null && (
            <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-md" onClick={openNew}>
              <Plus className="h-3.5 w-3.5" /> Nouvelle équipe
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function GroupeForm({ nom, setNom, saison, setSaison, formIds, toggleMembre, team, onSave, onCancel }: {
  nom: string; setNom: (v: string) => void;
  saison: string; setSaison: (v: string) => void;
  formIds: Set<string>; toggleMembre: (id: string) => void;
  team: EmployeDetail[]; onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="space-y-3 p-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-muted-foreground mb-1 text-[10px] font-semibold uppercase tracking-widest">Nom</p>
          <input
            autoFocus
            value={nom}
            onChange={e => setNom(e.target.value)}
            placeholder="Ex : Service soir"
            className="border-border bg-muted/30 w-full rounded-md border px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <p className="text-muted-foreground mb-1 text-[10px] font-semibold uppercase tracking-widest">Saison / tag</p>
          <input
            value={saison}
            onChange={e => setSaison(e.target.value)}
            placeholder="Ex : Été 2026"
            className="border-border bg-muted/30 w-full rounded-md border px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-widest">Membres</p>
        <div className="space-y-1">
          {team.map(emp => (
            <label key={emp.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/40">
              <input
                type="checkbox"
                checked={formIds.has(emp.id)}
                onChange={() => toggleMembre(emp.id)}
                className="accent-primary h-3.5 w-3.5 rounded"
              />
              <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", avatarCls())}>
                {emp.nom.charAt(0)}
              </div>
              <span className="text-sm">{emp.nom}</span>
              <span className="text-muted-foreground text-xs">{emp.poste}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-border pt-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>Annuler</Button>
        <Button size="sm" className="h-7 text-xs" onClick={onSave} disabled={!nom.trim()}>
          <Check className="mr-1 h-3 w-3" /> Enregistrer
        </Button>
      </div>
    </div>
  );
}

// ─── Secteurs ─────────────────────────────────────────────────────────────────

const SECTEUR: Record<string, string> = {
  "Chef de cuisine": "Cuisine",
  "Chef de partie":  "Cuisine",
  "Serveur":         "Service",
  "Serveuse":        "Service",
  "Barmaid":         "Bar",
  "Barman":          "Bar",
  "Plongeur":        "Plonge",
  "Plongeuse":       "Plonge",
};
const secteur = (p: string) => SECTEUR[p] ?? p;

export default function EquipePage() {
  const [team, setTeam]           = useState<EmployeDetail[]>(equipe);
  const [search, setSearch]       = useState("");
  const [metier, setMetier]       = useState("Tous");
  const [vue, setVue]             = useState<"cartes" | "liste">("cartes");
  const [selected, setSelected]   = useState<EmployeDetail | null>(null);
  const [equipesOpen, setEquipesOpen]   = useState(false);
  const [ajouterOpen, setAjouterOpen]   = useState(false);

  const METIERS = ["Tous", ...Array.from(new Set(team.map((e) => secteur(e.poste)))).sort()];

  function handleAddEmploye(emp: EmployeDetail) {
    setTeam(prev => [...prev, emp]);
  }

  function handleSave(id: string, patch: Pick<EmployeDetail, "email" | "telephone" | "indisponibilites">) {
    setTeam(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
    setSelected(prev => prev?.id === id ? { ...prev, ...patch } : prev);
  }

  const liste = team.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.nom.toLowerCase().includes(q) || e.poste.toLowerCase().includes(q);
    const matchMetier = metier === "Tous" || secteur(e.poste) === metier;
    return matchSearch && matchMetier;
  });

  const actifs    = team.filter((e) => e.statut === "actif");
  const nbActifs  = actifs.length;
  const totalH    = actifs.reduce((a, e) => a + e.heuresHebdo, 0);
  const nbAlertes = team.reduce((a, e) => a + (e.alertes?.length ?? 0), 0);

  return (
    <>
      <div className="flex flex-col">
        {/* Header */}
        <div className="space-y-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Équipe</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setEquipesOpen(true)}>
                <UsersRound className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Définir des équipes</span>
              </Button>
              <Button size="sm" className="h-8 gap-1.5" onClick={() => setAjouterOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ajouter un employé</span>
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { icon: Users,        label: "Employés",      value: team.length,    accent: false },
              { icon: Clock,        label: "Heures / sem.", value: `${totalH} h`,    accent: false },
              { icon: Users,        label: "Actifs",        value: nbActifs,         accent: true  },
              { icon: AlertCircle,  label: "Alertes",       value: nbAlertes,        accent: false, danger: nbAlertes > 0 },
            ].map(({ icon: Icon, label, value, accent, danger }) => (
              <Card key={label}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    accent ? "bg-primary" : danger ? "bg-red-100" : "bg-primary/10"
                  )}>
                    <Icon className={cn("h-5 w-5", accent ? "text-primary-foreground" : danger ? "text-red-600" : "text-primary")} />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{label}</p>
                    <p className="text-xl font-bold">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tab bar métiers */}
          <div className="-mx-4 overflow-x-auto md:-mx-6">
            <div className="flex border-b border-border px-4 md:px-6">
              {METIERS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetier(m)}
                  className={cn(
                    "shrink-0 border-b-2 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors",
                    metier === m
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m}
                  {m !== "Tous" && (
                    <span className="ml-1.5 text-[10px] opacity-50">
                      {team.filter((e) => secteur(e.poste) === m).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Recherche + toggle */}
          <div className="flex gap-2">
            <div className="border-border bg-muted/30 flex flex-1 items-center gap-2 rounded-lg border px-3 py-2">
              <Search className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              <input
                type="text"
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="border-border flex shrink-0 items-center gap-0.5 rounded-lg border p-1">
              {(["cartes", "liste"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVue(v)}
                  className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors", vue === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {v === "cartes" ? <LayoutGrid className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
                  {v === "cartes" ? "Vue cartes" : "Vue liste"}
                </button>
              ))}
            </div>
          </div>

          {liste.length === 0 && (
            <p className="text-muted-foreground py-12 text-center text-sm">Aucun résultat.</p>
          )}

          {/* ── Vue cartes ───────────────────────────────────────────────────── */}
          {vue === "cartes" && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {liste.map((emp) => {
                const sc        = STATUT_CFG[emp.statut];
                const cc        = CONTRAT_CFG[emp.contrat];
                const nbIndispo = emp.indisponibilites?.length ?? 0;
                const hasAlerte = (emp.alertes?.length ?? 0) > 0;
                return (
                  <Card
                    key={emp.id}
                    onClick={() => setSelected(emp)}
                    className="flex h-full cursor-pointer flex-col rounded-md transition-colors hover:border-primary/50"
                  >
                    <CardContent className="flex flex-1 flex-col p-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold", AVATAR_CLS)}>
                          {emp.nom.charAt(0)}
                          <span className={cn("absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-background", sc.dot)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <p className="truncate text-sm font-semibold">{emp.nom}</p>
                            <p className="text-muted-foreground shrink-0 text-xs">{emp.poste}</p>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {emp.heuresHebdo} h/sem.
                            {nbIndispo > 0 && <span className="ml-2 opacity-60">· {nbIndispo} indispo.</span>}
                            {emp.statut !== "actif" && (
                              <span className={cn("ml-2 font-medium", emp.statut === "congé" ? "text-amber-600" : "text-red-600")}>
                                · {emp.statut === "congé" ? "En congé" : "Arrêt maladie"}
                              </span>
                            )}
                          </p>
                        </div>
                        <span className={cn("shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold", cc.color)}>
                          {cc.label}
                        </span>
                      </div>
                      <div className="flex-1" />
                      {hasAlerte && (
                        <div className="mt-3 flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-1.5">
                          <span className="shrink-0 text-xs text-blue-400">●</span>
                          <p className="text-xs text-blue-600">{emp.alertes!.map(a => a.label).join("  ·  ")}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ── Vue liste (tableau) ───────────────────────────────────────────── */}
          {vue === "liste" && liste.length > 0 && (
            <div className="border-border overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border bg-muted/30 border-b">
                    <th className="text-muted-foreground px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-widest">Employé</th>
                    <th className="text-muted-foreground px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest">Contrat</th>
                    <th className="text-muted-foreground px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest">H/sem.</th>
                    <th className="text-muted-foreground px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest">Statut</th>
                    <th className="text-muted-foreground px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest">Alertes</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {liste.map((emp) => {
                    const sc        = STATUT_CFG[emp.statut];
                    const cc        = CONTRAT_CFG[emp.contrat];
                    const nbAlertes = emp.alertes?.length ?? 0;
                    return (
                      <tr
                        key={emp.id}
                        onClick={() => setSelected(emp)}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className={cn("relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", AVATAR_CLS)}>
                              {emp.nom.charAt(0)}
                              <span className={cn("absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border-2 border-background", sc.dot)} />
                            </div>
                            <div>
                              <p className="font-medium">{emp.nom}</p>
                              <p className="text-muted-foreground text-xs">{emp.poste}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold", cc.color)}>{cc.label}</span>
                        </td>
                        <td className="px-3 py-2.5 font-medium">{emp.heuresHebdo} h</td>
                        <td className="px-3 py-2.5">
                          <span className={cn("flex items-center gap-1.5 text-xs font-medium",
                            emp.statut === "arrêt_maladie" ? "text-red-600" : emp.statut === "congé" ? "text-amber-600" : "text-emerald-600"
                          )}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {nbAlertes > 0
                            ? <span className="text-muted-foreground text-xs">{nbAlertes} alerte{nbAlertes > 1 ? "s" : ""}</span>
                            : <span className="text-muted-foreground/30 text-xs">—</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <DetailPanel emp={selected} onClose={() => setSelected(null)} onSave={handleSave} />
      {equipesOpen && <EquipesModal team={team} onClose={() => setEquipesOpen(false)} />}
      {ajouterOpen && <AjouterEmployeModal onClose={() => setAjouterOpen(false)} onAdd={handleAddEmploye} />}
    </>
  );
}
