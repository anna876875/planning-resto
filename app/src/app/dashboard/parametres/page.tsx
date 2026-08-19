"use client";

import { useState, useEffect } from "react";
import { Plus, X, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadConfig, saveConfig, DEFAULT_CONFIG, type PlanningConfig } from "@/lib/planning/config";

// ─── Helpers UI ──────────────────────────────────────────────────────────────

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border pb-8">
      <div className="mb-5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1">
        <p className="text-[13px] font-medium">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
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

function NumberInput({ value, onChange, min = 1, max = 99 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={e => onChange(Number(e.target.value))}
      className="w-16 rounded-lg border border-border bg-background px-2.5 py-1.5 text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const JOURS_SEMAINE = [
  { idx: 1, label: "Lun" },
  { idx: 2, label: "Mar" },
  { idx: 3, label: "Mer" },
  { idx: 4, label: "Jeu" },
  { idx: 5, label: "Ven" },
  { idx: 6, label: "Sam" },
  { idx: 0, label: "Dim" },
];

const SERVICE_LABELS: Record<string, string> = {
  ouverture: "Ouverture",
  midi:      "Midi",
  soir:      "Soir",
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ParametresPage() {
  const [cfg, setCfg]     = useState<PlanningConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [newPoste, setNewPoste] = useState("");

  useEffect(() => { setCfg(loadConfig()); }, []);

  function update(patch: Partial<PlanningConfig>) {
    setCfg(prev => ({ ...prev, ...patch }));
  }

  function updateService(key: keyof PlanningConfig["services"], patch: Partial<PlanningConfig["services"]["ouverture"]>) {
    setCfg(prev => ({
      ...prev,
      services: { ...prev.services, [key]: { ...prev.services[key], ...patch } },
    }));
  }

  function toggleDisponibilite(dayIdx: number, svcKey: string) {
    setCfg(prev => {
      const current = prev.disponibilites[dayIdx] ?? [];
      const next = current.includes(svcKey)
        ? current.filter(s => s !== svcKey)
        : [...current, svcKey];
      return { ...prev, disponibilites: { ...prev.disponibilites, [dayIdx]: next } };
    });
  }

  function addPoste() {
    const trimmed = newPoste.trim();
    if (!trimmed || cfg.postes.includes(trimmed)) return;
    update({ postes: [...cfg.postes, trimmed] });
    setNewPoste("");
  }

  function removePoste(p: string) {
    update({
      postes: cfg.postes.filter(x => x !== p),
      postesTournants: cfg.postesTournants.filter(x => x !== p),
    });
  }

  function toggleTournant(p: string) {
    const list = cfg.postesTournants.includes(p)
      ? cfg.postesTournants.filter(x => x !== p)
      : [...cfg.postesTournants, p];
    update({ postesTournants: list });
  }

  function handleSave() {
    saveConfig(cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="px-4 py-4 md:px-6">

      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Configuration</h1>
        <Button size="sm" className="h-8 gap-1.5" onClick={handleSave}>
          {saved ? <Check className="h-3.5 w-3.5" /> : null}
          {saved ? "Enregistré" : "Enregistrer"}
        </Button>
      </div>

      <div className="flex flex-col gap-8">

        {/* ── Horaires de services ─────────────────────────────────── */}
        <Section title="Horaires de services" sub="Définit les créneaux affichés dans le planning.">
          {(["ouverture", "midi", "soir"] as const).map(key => (
            <div key={key} className="border-b border-border/40 last:border-0">
              <Field
                label={SERVICE_LABELS[key]}
                hint={`${cfg.services[key].debut} – ${cfg.services[key].fin}`}
              >
                <Toggle
                  checked={cfg.services[key].actif}
                  onChange={v => updateService(key, { actif: v })}
                />
              </Field>
              {cfg.services[key].actif && (
                <div className="mb-4 flex items-center gap-3 pl-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Début</span>
                    <TimeInput value={cfg.services[key].debut} onChange={v => updateService(key, { debut: v })} />
                  </div>
                  <span className="text-muted-foreground/40">→</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Fin</span>
                    <TimeInput value={cfg.services[key].fin} onChange={v => updateService(key, { fin: v })} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </Section>

        {/* ── Coupure ──────────────────────────────────────────────── */}
        <Section title="Coupure" sub="Période de fermeture entre les services — personne ne travaille.">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Début</span>
              <TimeInput value={cfg.coupure.debut} onChange={v => update({ coupure: { ...cfg.coupure, debut: v } })} />
            </div>
            <span className="text-muted-foreground/40">→</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Fin</span>
              <TimeInput value={cfg.coupure.fin} onChange={v => update({ coupure: { ...cfg.coupure, fin: v } })} />
            </div>
          </div>
        </Section>

        {/* ── Effectifs ────────────────────────────────────────────── */}
        <Section title="Effectifs" sub="Nombre moyen d'employés en service par jour selon la période.">
          <div className="flex flex-col gap-3">
            <Field label="Période stable" hint="Lun – Jeu · activité régulière">
              <NumberInput value={cfg.effectifs.stable} onChange={v => update({ effectifs: { ...cfg.effectifs, stable: v } })} />
            </Field>
            <Field label="Période d'affluence" hint="Ven – Sam · pic de fréquentation">
              <NumberInput value={cfg.effectifs.affluence} onChange={v => update({ effectifs: { ...cfg.effectifs, affluence: v } })} />
            </Field>
          </div>
        </Section>

        {/* ── Règles de repos ──────────────────────────────────────── */}
        <Section title="Règles de repos" sub="S'appliquent à la génération automatique du planning. ≠ congés payés.">
          <Field
            label="Répartition équitable des jours de repos"
            hint="Le générateur veille à équilibrer les repos entre employés sur le mois."
          >
            <Toggle checked={cfg.reposEquitable} onChange={v => update({ reposEquitable: v })} />
          </Field>
          <Field
            label="Jours de repos consécutifs max"
            hint="Ex : 2 → un employé ne peut pas avoir plus de 2 repos de suite. Différent des congés payés."
          >
            <NumberInput value={cfg.reposConsecutifsMax} min={1} max={7} onChange={v => update({ reposConsecutifsMax: v })} />
          </Field>
        </Section>

        {/* ── Horaires ─────────────────────────────────────────────── */}
        <Section
          title="Disponibilités"
          sub="Les horaires sont-ils fixes dans votre établissement ?"
        >
          <Field label="Horaires fixes" hint="Activez si les jours et services d'ouverture ne changent pas d'une semaine à l'autre.">
            <Toggle checked={cfg.horairesFixes} onChange={v => update({ horairesFixes: v })} />
          </Field>

          {cfg.horairesFixes && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Jour
                    </th>
                    {(["ouverture", "midi", "soir"] as const).map(s => (
                      <th key={s} className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {SERVICE_LABELS[s]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {JOURS_SEMAINE.map(({ idx, label }) => (
                    <tr key={idx} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2.5 text-[12px] font-medium">{label}</td>
                      {(["ouverture", "midi", "soir"] as const).map(sKey => {
                        const active = (cfg.disponibilites[idx] ?? []).includes(sKey);
                        return (
                          <td key={sKey} className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleDisponibilite(idx, sKey)}
                              className={cn(
                                "mx-auto flex h-5 w-5 items-center justify-center rounded border transition-colors",
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background"
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
          )}
        </Section>

        {/* ── Postes ───────────────────────────────────────────────── */}
        <Section title="Postes" sub="Les rôles présents dans votre établissement.">
          {/* Liste des postes */}
          <div className="mb-4 flex flex-wrap gap-2">
            {cfg.postes.map(p => (
              <span
                key={p}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1 text-[12px] font-medium"
              >
                {p}
                <button type="button" onClick={() => removePoste(p)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          {/* Ajouter un poste */}
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

          {/* Rotation des postes */}
          <div className="mt-5 border-t border-border/40 pt-5">
            <Field
              label="Les postes tournent-ils ?"
              hint="Ex : un serveur peut parfois faire la plonge ou le bar."
            >
              <Toggle checked={cfg.postesTournent} onChange={v => update({ postesTournent: v })} />
            </Field>

            {cfg.postesTournent && (
              <div className="mt-3">
                <p className="mb-2 text-[11px] text-muted-foreground">Sélectionnez les postes concernés par la rotation :</p>
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
                            : "border-border bg-background text-muted-foreground"
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
        </Section>

        {/* ── Repas ────────────────────────────────────────────────── */}
        <Section title="Avantages en nature">
          <Field
            label="Repas du personnel"
            hint="Le générateur prend en compte les repas pris en service pour le calcul des avantages."
          >
            <Toggle checked={cfg.repasPersonnel} onChange={v => update({ repasPersonnel: v })} />
          </Field>
        </Section>

        {/* ── Note prise en compte ─────────────────────────────────── */}
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/20 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Toutes ces informations sont utilisées lors de la <strong>génération automatique</strong> du planning pour optimiser la répartition des équipes, respecter les règles de repos et s'adapter aux contraintes de votre établissement.
          </p>
        </div>

        <div className="pb-20 md:pb-4">
          <Button className="w-full gap-1.5" onClick={handleSave}>
            {saved ? <Check className="h-4 w-4" /> : null}
            {saved ? "Configuration enregistrée !" : "Enregistrer la configuration"}
          </Button>
        </div>

      </div>
    </div>
  );
}
