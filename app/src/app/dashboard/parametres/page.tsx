"use client";

import { useState, useEffect } from "react";
import { Pencil, Check, Plus, X, Clock, Users, CalendarDays, Briefcase, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadConfig, saveConfig, DEFAULT_CONFIG, type PlanningConfig, type ServiceConfig } from "@/lib/planning/config";

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "services",       label: "Horaires",       icon: Clock           },
  { key: "equipe",         label: "Équipe",          icon: Users           },
  { key: "disponibilites", label: "Disponibilités",  icon: CalendarDays    },
  { key: "postes",         label: "Postes",          icon: Briefcase       },
  { key: "avantages",      label: "Avantages",       icon: UtensilsCrossed },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const JOURS = [
  { idx: 1, label: "Lun" }, { idx: 2, label: "Mar" }, { idx: 3, label: "Mer" },
  { idx: 4, label: "Jeu" }, { idx: 5, label: "Ven" }, { idx: 6, label: "Sam" },
  { idx: 0, label: "Dim" },
];

// ─── Helpers UI ──────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span className={cn(
        "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
        checked ? "translate-x-4" : "translate-x-0"
      )} />
    </button>
  );
}

function Row({
  label, hint, value, editing, onEdit, onDone, children,
}: {
  label: string; hint?: string; value: React.ReactNode;
  editing: boolean; onEdit: () => void; onDone: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-border/40 py-4 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
        {editing ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {children}
            <button
              type="button"
              onClick={onDone}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <p className="mt-1 text-[12px] text-muted-foreground">{value}</p>
        )}
      </div>
      {!editing && (
        <button
          type="button"
          onClick={onEdit}
          className="mt-0.5 shrink-0 rounded-md p-1.5 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function NumberInput({ value, onChange, min = 1, max = 99, unit }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; unit?: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(Number(e.target.value))}
        className="w-16 rounded-lg border border-border bg-background px-2.5 py-1.5 text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
    </span>
  );
}

// Sélecteur de jours (pills inline) — auto-save
function DayPicker({
  selected, onChange,
}: {
  selected: number[]; onChange: (days: number[]) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {JOURS.map(({ idx, label }) => {
        const active = selected.includes(idx);
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onChange(active ? selected.filter(d => d !== idx) : [...selected, idx])}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/40"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// Card de configuration d'un service (Matin ou Soir)
function ServiceCard({
  svcKey, svc, editing, setEditing, onUpdate, onSave,
}: {
  svcKey: "matin" | "soir";
  svc: ServiceConfig;
  editing: string | null;
  setEditing: (v: string | null) => void;
  onUpdate: (patch: Partial<ServiceConfig>) => void;
  onSave: () => void;
}) {
  const label = svcKey === "matin" ? "Matin" : "Soir";

  function done(field: string) {
    setEditing(null);
    onSave();
  }

  const is = (f: string) => editing === `${svcKey}-${f}`;

  return (
    <div className="rounded-xl border border-border bg-card mb-4">
      {/* Header service */}
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <span className="text-[13px] font-semibold">{label}</span>
        <Toggle checked={svc.actif} onChange={v => { onUpdate({ actif: v }); onSave(); }} />
        {!svc.actif && <span className="text-[11px] text-muted-foreground">Service désactivé</span>}
      </div>

      {svc.actif && (
        <div className="px-4">
          {/* Horaires */}
          <Row
            label="Horaires"
            value={`${svc.debut} → ${svc.fin}`}
            editing={is("horaires")}
            onEdit={() => setEditing(`${svcKey}-horaires`)}
            onDone={() => done("horaires")}
          >
            <TimeInput value={svc.debut} onChange={v => onUpdate({ debut: v })} />
            <span className="text-muted-foreground/40 text-xs">→</span>
            <TimeInput value={svc.fin} onChange={v => onUpdate({ fin: v })} />
          </Row>

          {/* Effectifs */}
          <Row
            label="Effectifs"
            hint="Nombre de personnes par service selon la période"
            value={`${svc.effectifStable} en période stable · ${svc.effectifAffluence} en affluence`}
            editing={is("effectifs")}
            onEdit={() => setEditing(`${svcKey}-effectifs`)}
            onDone={() => done("effectifs")}
          >
            <span className="text-xs text-muted-foreground">Stable</span>
            <NumberInput value={svc.effectifStable} min={1} max={30} onChange={v => onUpdate({ effectifStable: v })} />
            <span className="text-xs text-muted-foreground ml-2">Affluence</span>
            <NumberInput value={svc.effectifAffluence} min={1} max={30} onChange={v => onUpdate({ effectifAffluence: v })} />
          </Row>

          {/* Jours d'affluence */}
          <div className="border-b border-border/40 py-4 last:border-0">
            <p className="text-[13px] font-medium">Jours d'affluence</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Jours où l'effectif passe à {svc.effectifAffluence} personnes.
            </p>
            <DayPicker
              selected={svc.joursAffluence}
              onChange={days => { onUpdate({ joursAffluence: days }); onSave(); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ParametresPage() {
  const [cfg, setCfg]           = useState<PlanningConfig>(DEFAULT_CONFIG);
  const [tab, setTab]           = useState<TabKey>("services");
  const [editing, setEditing]   = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);
  const [newPoste, setNewPoste] = useState("");

  useEffect(() => { setCfg(loadConfig()); }, []);

  function update(patch: Partial<PlanningConfig>) {
    setCfg(prev => ({ ...prev, ...patch }));
  }

  function save(cfg: PlanningConfig) {
    saveConfig(cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function done() {
    setEditing(null);
    save(cfg);
  }

  function updateService(key: "matin" | "soir", patch: Partial<ServiceConfig>) {
    setCfg(prev => {
      const next = { ...prev, services: { ...prev.services, [key]: { ...prev.services[key], ...patch } } };
      return next;
    });
  }

  function saveService() {
    save(cfg);
  }

  function toggleDisponibilite(dayIdx: number, svcKey: string) {
    setCfg(prev => {
      const cur  = prev.disponibilites[dayIdx] ?? [];
      const next = cur.includes(svcKey) ? cur.filter(s => s !== svcKey) : [...cur, svcKey];
      const updated = { ...prev, disponibilites: { ...prev.disponibilites, [dayIdx]: next } };
      save(updated);
      return updated;
    });
  }

  function addPoste() {
    const t = newPoste.trim();
    if (!t || cfg.postes.includes(t)) return;
    const updated = { ...cfg, postes: [...cfg.postes, t] };
    setCfg(updated);
    save(updated);
    setNewPoste("");
  }

  function removePoste(p: string) {
    const updated = { ...cfg, postes: cfg.postes.filter(x => x !== p), postesTournants: cfg.postesTournants.filter(x => x !== p) };
    setCfg(updated);
    save(updated);
  }

  function toggleTournant(p: string) {
    const list    = cfg.postesTournants.includes(p)
      ? cfg.postesTournants.filter(x => x !== p)
      : [...cfg.postesTournants, p];
    const updated = { ...cfg, postesTournants: list };
    setCfg(updated);
    save(updated);
  }

  function toggleBoolean(field: keyof PlanningConfig, value: boolean) {
    const updated = { ...cfg, [field]: value };
    setCfg(updated);
    save(updated);
  }

  const is = (f: string) => editing === f;

  return (
    <div className="flex flex-col px-4 py-4 md:px-6">

      {/* En-tête */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Configuration</h1>
        {saved && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
            <Check className="h-3 w-3" /> Enregistré
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-0.5 overflow-x-auto border-b border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setEditing(null); }}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-3 pt-1 text-[12px] font-medium transition-colors",
              tab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── HORAIRES ─────────────────────────────────────────────── */}
      {tab === "services" && (
        <div className="flex flex-col">
          <p className="mb-4 text-[11px] text-muted-foreground">
            Horaires, effectifs et jours d'affluence pour chaque service.
          </p>

          {(["matin", "soir"] as const).map(key => (
            <ServiceCard
              key={key}
              svcKey={key}
              svc={cfg.services[key]}
              editing={editing}
              setEditing={setEditing}
              onUpdate={patch => { updateService(key, patch); }}
              onSave={saveService}
            />
          ))}

          <div className="mt-2">
            <Row
              label="Coupure"
              hint="Période de fermeture entre les services — personne ne travaille."
              value={`${cfg.coupure.debut} → ${cfg.coupure.fin}`}
              editing={is("coupure")}
              onEdit={() => setEditing("coupure")}
              onDone={done}
            >
              <TimeInput value={cfg.coupure.debut} onChange={v => update({ coupure: { ...cfg.coupure, debut: v } })} />
              <span className="text-muted-foreground/40 text-xs">→</span>
              <TimeInput value={cfg.coupure.fin} onChange={v => update({ coupure: { ...cfg.coupure, fin: v } })} />
            </Row>
          </div>
        </div>
      )}

      {/* ── ÉQUIPE ───────────────────────────────────────────────── */}
      {tab === "equipe" && (
        <div className="flex flex-col">
          <p className="mb-4 text-[11px] text-muted-foreground">Règles de repos et contraintes légales pour la génération.</p>

          {/* Règles de repos */}
          <p className="mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Repos</p>

          <div className="flex items-center justify-between border-b border-border/40 py-4">
            <div>
              <p className="text-[13px] font-medium">Répartition équitable des weekends</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Alterne les week-ends travaillés entre employés.</p>
            </div>
            <Toggle checked={cfg.weekendEquitable} onChange={v => toggleBoolean("weekendEquitable", v)} />
          </div>

          <div className="flex items-center justify-between border-b border-border/40 py-4">
            <div>
              <p className="text-[13px] font-medium">Répartition équitable des repos</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Équilibre les jours de repos entre employés sur le mois.</p>
            </div>
            <Toggle checked={cfg.reposEquitable} onChange={v => toggleBoolean("reposEquitable", v)} />
          </div>

          <Row
            label="Repos consécutifs max"
            hint="Jours de repos d'affilée autorisés — différent des congés payés."
            value={`${cfg.reposConsecutifsMax} jour${cfg.reposConsecutifsMax > 1 ? "s" : ""} max`}
            editing={is("reposMax")}
            onEdit={() => setEditing("reposMax")}
            onDone={done}
          >
            <NumberInput value={cfg.reposConsecutifsMax} min={1} max={7} onChange={v => update({ reposConsecutifsMax: v })} />
          </Row>

          <Row
            label="Jours de repos / semaine"
            hint="Minimum légal : 1 jour. Recommandé : 2 jours."
            value={`${cfg.joursReposParSemaine} jour${cfg.joursReposParSemaine > 1 ? "s" : ""} / semaine`}
            editing={is("joursRepos")}
            onEdit={() => setEditing("joursRepos")}
            onDone={done}
          >
            <NumberInput value={cfg.joursReposParSemaine} min={1} max={3} onChange={v => update({ joursReposParSemaine: v })} />
          </Row>

          {/* Contraintes légales */}
          <p className="mt-5 mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Contraintes légales</p>

          <Row
            label="Repos entre deux services"
            hint="Droit du travail FR : 11h minimum entre la fin d'un service et le début du suivant."
            value={`${cfg.reposEntreServicesH}h minimum`}
            editing={is("reposH")}
            onEdit={() => setEditing("reposH")}
            onDone={done}
          >
            <NumberInput value={cfg.reposEntreServicesH} min={8} max={16} unit="heures" onChange={v => update({ reposEntreServicesH: v })} />
          </Row>

          <Row
            label="Jours consécutifs max"
            hint="Droit du travail FR : 6 jours maximum sans repos."
            value={`${cfg.joursConsecutifsMax} jours max`}
            editing={is("joursConsec")}
            onEdit={() => setEditing("joursConsec")}
            onDone={done}
          >
            <NumberInput value={cfg.joursConsecutifsMax} min={3} max={6} onChange={v => update({ joursConsecutifsMax: v })} />
          </Row>

          <Row
            label="Heures contrat / semaine"
            hint="Heures hebdomadaires contractuelles — définit le nombre de jours travaillés / semaine."
            value={`${cfg.heuresContratHebdo}h / semaine`}
            editing={is("heuresHebdo")}
            onEdit={() => setEditing("heuresHebdo")}
            onDone={done}
          >
            <NumberInput value={cfg.heuresContratHebdo} min={20} max={48} unit="heures" onChange={v => update({ heuresContratHebdo: v })} />
          </Row>
        </div>
      )}

      {/* ── DISPONIBILITÉS ───────────────────────────────────────── */}
      {tab === "disponibilites" && (
        <div className="flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">Jours et services d'ouverture de votre établissement.</p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Horaires fixes</span>
              <Toggle checked={cfg.horairesFixes} onChange={v => toggleBoolean("horairesFixes", v)} />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Jour</th>
                  {(["matin", "soir"] as const).map(s => (
                    <th key={s} className="px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {s === "matin" ? "Matin" : "Soir"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {JOURS.map(({ idx, label }) => (
                  <tr key={idx} className={cn("border-b border-border/40 last:border-0", idx === 0 && "bg-muted/10")}>
                    <td className="px-4 py-3 text-[12px] font-medium">{label}</td>
                    {(["matin", "soir"] as const).map(sKey => {
                      const active = (cfg.disponibilites[idx] ?? []).includes(sKey);
                      return (
                        <td key={sKey} className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleDisponibilite(idx, sKey)}
                            className={cn(
                              "mx-auto flex h-5 w-5 items-center justify-center rounded border transition-colors",
                              active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary/40"
                            )}
                          >
                            {active && <Check className="h-3 w-3" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── POSTES ───────────────────────────────────────────────── */}
      {tab === "postes" && (
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-3 text-[11px] text-muted-foreground">Les rôles présents dans votre établissement.</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {cfg.postes.map(p => (
                <span key={p} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1 text-[12px] font-medium">
                  {p}
                  <button type="button" onClick={() => removePoste(p)} className="text-muted-foreground/50 hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPoste}
                onChange={e => setNewPoste(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addPoste()}
                placeholder="Ex : Runner, Caissier…"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button variant="outline" size="sm" onClick={addPoste} className="h-8 gap-1">
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </Button>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium">Les postes tournent-ils ?</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Ex : un serveur peut ponctuellement faire la plonge.</p>
              </div>
              <Toggle checked={cfg.postesTournent} onChange={v => toggleBoolean("postesTournent", v)} />
            </div>

            {cfg.postesTournent && (
              <>
                <p className="mb-2 text-[11px] text-muted-foreground">Postes concernés par la rotation :</p>
                <div className="flex flex-wrap gap-2">
                  {cfg.postes.map(p => {
                    const active = cfg.postesTournants.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => toggleTournant(p)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── AVANTAGES ────────────────────────────────────────────── */}
      {tab === "avantages" && (
        <div className="flex flex-col">
          <p className="mb-4 text-[11px] text-muted-foreground">Avantages en nature pris en compte dans la génération.</p>
          <div className="flex items-center justify-between border-b border-border/40 py-4">
            <div>
              <p className="text-[13px] font-medium">Repas du personnel</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Les repas pris en service sont pris en compte dans le calcul des avantages.</p>
            </div>
            <Toggle checked={cfg.repasPersonnel} onChange={v => toggleBoolean("repasPersonnel", v)} />
          </div>
        </div>
      )}

    </div>
  );
}
