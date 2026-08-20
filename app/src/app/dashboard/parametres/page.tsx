"use client";

import { useState, useEffect } from "react";
import { Check, Plus, X, Clock, Users, CalendarDays, Briefcase, UtensilsCrossed } from "lucide-react";
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

// ─── Primitives UI ───────────────────────────────────────────────────────────

function Checkbox({ checked, onChange, label, hint }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
          checked ? "bg-primary border-primary" : "border-border bg-background hover:border-primary/50"
        )}
      >
        {checked && <Check className="h-2.5 w-2.5 text-white" />}
      </button>
      <div>
        <span className="text-[13px] font-medium leading-snug">{label}</span>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-44 shrink-0 text-[12px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function TimeInput({ value, onChange, onBlur }: { value: string; onChange: (v: string) => void; onBlur?: () => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/50"
    />
  );
}

function NumInput({ value, onChange, onBlur, min = 1, max = 99, unit, width = "w-14" }: {
  value: number; onChange: (v: number) => void; onBlur?: () => void;
  min?: number; max?: number; unit?: string; width?: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(Number(e.target.value))}
        onBlur={onBlur}
        className={cn("rounded-lg border border-border bg-background px-2.5 py-1.5 text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/50", width)}
      />
      {unit && <span className="text-[12px] text-muted-foreground">{unit}</span>}
    </span>
  );
}

function DayPicker({ selected, onChange }: { selected: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {JOURS.map(({ idx, label }) => {
        const on = selected.includes(idx);
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onChange(on ? selected.filter(d => d !== idx) : [...selected, idx])}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
              on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Bloc service (Matin / Soir) ─────────────────────────────────────────────

function ServiceBlock({ svcKey, svc, onUpdate }: {
  svcKey: "matin" | "soir";
  svc: ServiceConfig;
  onUpdate: (patch: Partial<ServiceConfig>, save?: boolean) => void;
}) {
  const label      = svcKey === "matin" ? "Matin" : "Soir";
  const hasAffluence = svc.joursAffluence.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card mb-3">
      {/* Activation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <Checkbox
          checked={svc.actif}
          onChange={v => onUpdate({ actif: v }, true)}
          label={label}
        />
      </div>

      {svc.actif && (
        <div className="px-4 py-3 space-y-2">
          {/* Horaires */}
          <Field label="Horaires du service">
            <TimeInput value={svc.debut} onChange={v => onUpdate({ debut: v })} onBlur={() => onUpdate({}, true)} />
            <span className="text-muted-foreground/50 text-xs">→</span>
            <TimeInput value={svc.fin} onChange={v => onUpdate({ fin: v })} onBlur={() => onUpdate({}, true)} />
          </Field>

          {/* Effectif de base */}
          <Field label="Effectif par service">
            <NumInput value={svc.effectifStable} min={1} max={30} unit="personnes"
              onChange={v => onUpdate({ effectifStable: v })} onBlur={() => onUpdate({}, true)} />
          </Field>

          {/* Affluence — checkbox reveal */}
          <div className="pt-2 space-y-3">
            <Checkbox
              checked={hasAffluence}
              onChange={v => onUpdate({ joursAffluence: v ? [5, 6] : [] }, true)}
              label="Jours d'affluence spécifiques"
              hint="Certains jours nécessitent plus de monde"
            />

            {hasAffluence && (
              <div className="ml-6 space-y-2.5 border-l border-border/50 pl-4">
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Jours concernés</p>
                  <DayPicker selected={svc.joursAffluence} onChange={days => onUpdate({ joursAffluence: days }, true)} />
                </div>
                <Field label="Effectif ces jours-là">
                  <NumInput value={svc.effectifAffluence} min={svc.effectifStable} max={30} unit="personnes"
                    onChange={v => onUpdate({ effectifAffluence: v })} onBlur={() => onUpdate({}, true)} />
                </Field>
              </div>
            )}
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
  const [saved, setSaved]       = useState(false);
  const [newPoste, setNewPoste] = useState("");
  // états de révélation dans l'onglet Équipe
  const [showLegal, setShowLegal] = useState(false);

  useEffect(() => { setCfg(loadConfig()); }, []);

  function persist(next: PlanningConfig) {
    saveConfig(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  function update(patch: Partial<PlanningConfig>, save = false) {
    setCfg(prev => {
      const next = { ...prev, ...patch };
      if (save) persist(next);
      return next;
    });
  }

  function updateService(key: "matin" | "soir", patch: Partial<ServiceConfig>, save = false) {
    setCfg(prev => {
      const next = { ...prev, services: { ...prev.services, [key]: { ...prev.services[key], ...patch } } };
      if (save) persist(next);
      return next;
    });
  }

  function toggleDisponibilite(dayIdx: number, svcKey: string) {
    setCfg(prev => {
      const cur  = prev.disponibilites[dayIdx] ?? [];
      const next = cur.includes(svcKey) ? cur.filter(s => s !== svcKey) : [...cur, svcKey];
      const updated = { ...prev, disponibilites: { ...prev.disponibilites, [dayIdx]: next } };
      persist(updated);
      return updated;
    });
  }

  function addPoste() {
    const t = newPoste.trim();
    if (!t || cfg.postes.includes(t)) return;
    const next = { ...cfg, postes: [...cfg.postes, t] };
    setCfg(next); persist(next); setNewPoste("");
  }

  function removePoste(p: string) {
    const next = { ...cfg, postes: cfg.postes.filter(x => x !== p), postesTournants: cfg.postesTournants.filter(x => x !== p) };
    setCfg(next); persist(next);
  }

  function toggleTournant(p: string) {
    const list = cfg.postesTournants.includes(p)
      ? cfg.postesTournants.filter(x => x !== p)
      : [...cfg.postesTournants, p];
    const next = { ...cfg, postesTournants: list };
    setCfg(next); persist(next);
  }

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
            onClick={() => setTab(key)}
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
        <div>
          <p className="mb-4 text-[11px] text-muted-foreground">
            Activez les services et définissez les horaires, effectifs et pics d'activité.
          </p>

          {(["matin", "soir"] as const).map(key => (
            <ServiceBlock
              key={key}
              svcKey={key}
              svc={cfg.services[key]}
              onUpdate={(patch, save) => updateService(key, patch, save)}
            />
          ))}

          {/* Coupure */}
          <div className="mt-2 rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
            <p className="text-[12px] font-medium mb-2">Coupure inter-services</p>
            <Field label="Période de fermeture">
              <TimeInput value={cfg.coupure.debut} onChange={v => update({ coupure: { ...cfg.coupure, debut: v } })} onBlur={() => persist(cfg)} />
              <span className="text-muted-foreground/50 text-xs">→</span>
              <TimeInput value={cfg.coupure.fin} onChange={v => update({ coupure: { ...cfg.coupure, fin: v } })} onBlur={() => persist(cfg)} />
            </Field>
          </div>
        </div>
      )}

      {/* ── ÉQUIPE ───────────────────────────────────────────────── */}
      {tab === "equipe" && (
        <div className="space-y-5">
          <p className="text-[11px] text-muted-foreground">Règles de repos et contraintes utilisées pour la génération.</p>

          {/* Repos */}
          <div className="space-y-4">
            <Field label="Jours de repos / semaine">
              <NumInput value={cfg.joursReposParSemaine} min={1} max={3}
                onChange={v => update({ joursReposParSemaine: v })} onBlur={() => persist(cfg)} />
            </Field>

            <div className="space-y-3">
              <Checkbox
                checked={cfg.weekendEquitable}
                onChange={v => update({ weekendEquitable: v }, true)}
                label="Répartition équitable des weekends"
                hint="Alterne les week-ends travaillés entre employés"
              />

              <Checkbox
                checked={cfg.reposEquitable}
                onChange={v => update({ reposEquitable: v }, true)}
                label="Répartition équitable des repos"
                hint="Équilibre les jours de repos sur le mois"
              />

              {cfg.reposEquitable && (
                <div className="ml-6 border-l border-border/50 pl-4">
                  <Checkbox
                    checked={cfg.reposConsecutifsMax > 0}
                    onChange={v => update({ reposConsecutifsMax: v ? 2 : 0 }, true)}
                    label="Limiter les repos consécutifs"
                    hint="Différent des congés payés"
                  />
                  {cfg.reposConsecutifsMax > 0 && (
                    <div className="ml-6 mt-2">
                      <Field label="Maximum">
                        <NumInput value={cfg.reposConsecutifsMax} min={1} max={7} unit="jours d'affilée"
                          onChange={v => update({ reposConsecutifsMax: v })} onBlur={() => persist(cfg)} />
                      </Field>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contraintes légales */}
          <div className="border-t border-border/40 pt-4 space-y-3">
            <Checkbox
              checked={showLegal}
              onChange={setShowLegal}
              label="Personnaliser les contraintes légales"
              hint="Droit du travail FR — modifiez uniquement si votre convention collective le permet"
            />

            {showLegal && (
              <div className="ml-6 border-l border-border/50 pl-4 space-y-2">
                <Field label="Repos entre deux services">
                  <NumInput value={cfg.reposEntreServicesH} min={8} max={16} unit="h min."
                    onChange={v => update({ reposEntreServicesH: v })} onBlur={() => persist(cfg)} />
                </Field>
                <Field label="Jours consécutifs max">
                  <NumInput value={cfg.joursConsecutifsMax} min={3} max={6} unit="jours"
                    onChange={v => update({ joursConsecutifsMax: v })} onBlur={() => persist(cfg)} />
                </Field>
                <Field label="Heures contrat / semaine">
                  <NumInput value={cfg.heuresContratHebdo} min={20} max={48} unit="h"
                    onChange={v => update({ heuresContratHebdo: v })} onBlur={() => persist(cfg)} />
                </Field>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DISPONIBILITÉS ───────────────────────────────────────── */}
      {tab === "disponibilites" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">Jours et services d'ouverture de l'établissement.</p>
            <Checkbox
              checked={cfg.horairesFixes}
              onChange={v => update({ horairesFixes: v }, true)}
              label="Horaires fixes"
            />
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
                              "mx-auto flex h-4 w-4 items-center justify-center rounded border transition-colors",
                              active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/40"
                            )}
                          >
                            {active && <Check className="h-2.5 w-2.5" />}
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
        <div className="space-y-6">
          <div>
            <p className="mb-3 text-[11px] text-muted-foreground">Rôles présents dans votre établissement.</p>
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
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
              <Button variant="outline" size="sm" onClick={addPoste} className="h-8 gap-1">
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </Button>
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <Checkbox
              checked={cfg.postesTournent}
              onChange={v => update({ postesTournent: v }, true)}
              label="Les postes tournent"
              hint="Ex : un serveur peut ponctuellement faire la plonge"
            />

            {cfg.postesTournent && (
              <div className="ml-6 border-l border-border/50 pl-4">
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
                            : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AVANTAGES ────────────────────────────────────────────── */}
      {tab === "avantages" && (
        <div className="space-y-4">
          <p className="text-[11px] text-muted-foreground">Avantages en nature pris en compte dans la génération.</p>
          <Checkbox
            checked={cfg.repasPersonnel}
            onChange={v => update({ repasPersonnel: v }, true)}
            label="Repas du personnel"
            hint="Les repas pris en service sont pris en compte dans le calcul des avantages"
          />
        </div>
      )}

    </div>
  );
}
