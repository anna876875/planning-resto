"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  loadConfig, saveConfig, DEFAULT_CONFIG,
  type PlanningConfig, type ServiceConfig,
} from "@/lib/planning/config";

// ─── Primitives ──────────────────────────────────────────────────────────────

function Cb({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => set(!on)}
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
        on ? "bg-primary border-primary" : "border-border hover:border-primary/40"
      )}
    >
      {on && <Check className="h-2.5 w-2.5 text-white" />}
    </button>
  );
}

function Ti({ value, onChange, onBlur }: {
  value: string; onChange: (v: string) => void; onBlur?: () => void;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      className="w-[5.5rem] rounded-md bg-muted/40 px-2 py-0.5 text-[12px] tabular-nums focus:outline-none focus:ring-1 focus:ring-ring/40 focus:bg-background"
    />
  );
}

function Ni({ value, onChange, onBlur, min = 1, max = 99, unit, w = "w-10" }: {
  value: number; onChange: (v: number) => void; onBlur?: () => void;
  min?: number; max?: number; unit?: string; w?: string;
}) {
  return (
    <>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(Number(e.target.value))}
        onBlur={onBlur}
        className={cn("rounded-md bg-muted/40 px-2 py-0.5 text-center text-[12px] tabular-nums focus:outline-none focus:ring-1 focus:ring-ring/40 focus:bg-background", w)}
      />
      {unit && <span className="text-[11px] text-muted-foreground">{unit}</span>}
    </>
  );
}

// Question row — label left, control right
function Q({ label, sub = false, sub2 = false, children }: {
  label: string; sub?: boolean; sub2?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={cn(
      "flex min-h-[2.25rem] items-center justify-between gap-4 border-b border-border/25 py-1.5",
      sub2 ? "pl-10" : sub ? "pl-5" : ""
    )}>
      <span className={cn(
        "text-[12px] leading-snug",
        sub2 ? "text-muted-foreground/70" : sub ? "text-muted-foreground" : "font-medium"
      )}>
        {label}
      </span>
      <div className="shrink-0 flex items-center gap-1.5">{children}</div>
    </div>
  );
}

// Section header
function S({ label }: { label: string }) {
  return (
    <p className="pt-6 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
      {label}
    </p>
  );
}

// Day pills (2-letter, compact)
const JOURS_SHORT = [
  { idx: 1, s: "Lu" }, { idx: 2, s: "Ma" }, { idx: 3, s: "Me" },
  { idx: 4, s: "Je" }, { idx: 5, s: "Ve" }, { idx: 6, s: "Sa" },
  { idx: 0, s: "Di" },
];
function Days({ sel, set }: { sel: number[]; set: (v: number[]) => void }) {
  return (
    <div className="flex gap-1">
      {JOURS_SHORT.map(({ idx, s }) => {
        const on = sel.includes(idx);
        return (
          <button
            key={idx}
            type="button"
            onClick={() => set(on ? sel.filter(d => d !== idx) : [...sel, idx])}
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
              on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const JOURS_TABLE = [
  { idx: 1, l: "Lun" }, { idx: 2, l: "Mar" }, { idx: 3, l: "Mer" },
  { idx: 4, l: "Jeu" }, { idx: 5, l: "Ven" }, { idx: 6, l: "Sam" },
  { idx: 0, l: "Dim" },
];

export default function ParametresPage() {
  const [cfg, setCfg]           = useState<PlanningConfig>(DEFAULT_CONFIG);
  const [saved, setSaved]       = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [newPoste, setNewPoste] = useState("");
  const ref = useRef<PlanningConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const c = loadConfig();
    ref.current = c;
    setCfg(c);
  }, []);

  function persist(next: PlanningConfig) {
    saveConfig(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1100);
  }

  // patch top-level fields
  function set(patch: Partial<PlanningConfig>, now = false) {
    const next = { ...ref.current, ...patch };
    ref.current = next;
    setCfg(next);
    if (now) persist(next);
  }

  // patch a service
  function setSvc(key: "matin" | "soir", patch: Partial<ServiceConfig>, now = false) {
    const next = { ...ref.current, services: { ...ref.current.services, [key]: { ...ref.current.services[key], ...patch } } };
    ref.current = next;
    setCfg(next);
    if (now) persist(next);
  }

  function flush() { persist(ref.current); }

  function toggleDispo(day: number, svc: string) {
    const cur = ref.current.disponibilites[day] ?? [];
    const next = cur.includes(svc) ? cur.filter(s => s !== svc) : [...cur, svc];
    set({ disponibilites: { ...ref.current.disponibilites, [day]: next } }, true);
  }

  const m = cfg.services.matin;
  const s = cfg.services.soir;

  return (
    <div className="px-4 py-4 md:px-6 max-w-lg">

      {/* Titre */}
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Configuration</h1>
        {saved && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-600">
            <Check className="h-3 w-3" /> Enregistré
          </span>
        )}
      </div>

      {/* ── Services ────────────────────────────────────────────── */}
      <S label="Services" />

      {/* Matin */}
      <Q label="Service matin actif ?">
        <Cb on={m.actif} set={v => setSvc("matin", { actif: v }, true)} />
      </Q>
      {m.actif && <>
        <Q label="Horaires du matin" sub>
          <Ti value={m.debut} onChange={v => setSvc("matin", { debut: v })} onBlur={flush} />
          <span className="text-[10px] text-muted-foreground/40">→</span>
          <Ti value={m.fin}   onChange={v => setSvc("matin", { fin: v })}   onBlur={flush} />
        </Q>
        <Q label="Effectif par service" sub>
          <Ni value={m.effectifStable} min={1} max={30} unit="pers." onChange={v => setSvc("matin", { effectifStable: v })} onBlur={flush} />
        </Q>
        <Q label="Jours d'affluence ?" sub>
          <Cb on={m.joursAffluence.length > 0} set={v => setSvc("matin", { joursAffluence: v ? [5, 6] : [] }, true)} />
        </Q>
        {m.joursAffluence.length > 0 && <>
          <Q label="Jours concernés" sub2>
            <Days sel={m.joursAffluence} set={d => setSvc("matin", { joursAffluence: d }, true)} />
          </Q>
          <Q label="Effectif ces jours-là" sub2>
            <Ni value={m.effectifAffluence} min={m.effectifStable} max={30} unit="pers." onChange={v => setSvc("matin", { effectifAffluence: v })} onBlur={flush} />
          </Q>
        </>}
      </>}

      {/* Soir */}
      <Q label="Service soir actif ?">
        <Cb on={s.actif} set={v => setSvc("soir", { actif: v }, true)} />
      </Q>
      {s.actif && <>
        <Q label="Horaires du soir" sub>
          <Ti value={s.debut} onChange={v => setSvc("soir", { debut: v })} onBlur={flush} />
          <span className="text-[10px] text-muted-foreground/40">→</span>
          <Ti value={s.fin}   onChange={v => setSvc("soir", { fin: v })}   onBlur={flush} />
        </Q>
        <Q label="Effectif par service" sub>
          <Ni value={s.effectifStable} min={1} max={30} unit="pers." onChange={v => setSvc("soir", { effectifStable: v })} onBlur={flush} />
        </Q>
        <Q label="Jours d'affluence ?" sub>
          <Cb on={s.joursAffluence.length > 0} set={v => setSvc("soir", { joursAffluence: v ? [5, 6] : [] }, true)} />
        </Q>
        {s.joursAffluence.length > 0 && <>
          <Q label="Jours concernés" sub2>
            <Days sel={s.joursAffluence} set={d => setSvc("soir", { joursAffluence: d }, true)} />
          </Q>
          <Q label="Effectif ces jours-là" sub2>
            <Ni value={s.effectifAffluence} min={s.effectifStable} max={30} unit="pers." onChange={v => setSvc("soir", { effectifAffluence: v })} onBlur={flush} />
          </Q>
        </>}
      </>}

      {/* Coupure */}
      <Q label="Horaires de la coupure">
        <Ti value={cfg.coupure.debut} onChange={v => set({ coupure: { ...cfg.coupure, debut: v } })} onBlur={flush} />
        <span className="text-[10px] text-muted-foreground/40">→</span>
        <Ti value={cfg.coupure.fin}   onChange={v => set({ coupure: { ...cfg.coupure, fin: v } })}   onBlur={flush} />
      </Q>

      {/* ── Jours d'ouverture ────────────────────────────────────── */}
      <S label="Jours d'ouverture" />

      <div className="py-2">
        {/* Header */}
        <div className="grid grid-cols-[6rem_1fr_1fr] mb-1">
          <span />
          {(["Matin", "Soir"] as const).map(l => (
            <span key={l} className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{l}</span>
          ))}
        </div>
        {/* Rows */}
        {JOURS_TABLE.map(({ idx, l }) => (
          <div key={idx} className="grid grid-cols-[6rem_1fr_1fr] border-b border-border/20 py-1.5">
            <span className="text-[12px] text-muted-foreground">{l}</span>
            {(["matin", "soir"] as const).map(svc => {
              const on = (cfg.disponibilites[idx] ?? []).includes(svc);
              return (
                <div key={svc} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => toggleDispo(idx, svc)}
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                      on ? "bg-primary border-primary" : "border-border hover:border-primary/40"
                    )}
                  >
                    {on && <Check className="h-2.5 w-2.5 text-white" />}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Planning ─────────────────────────────────────────────── */}
      <S label="Règles de planning" />

      <Q label="Jours de repos par semaine">
        <Ni value={cfg.joursReposParSemaine} min={1} max={3} unit="j" onChange={v => set({ joursReposParSemaine: v })} onBlur={flush} />
      </Q>
      <Q label="Répartition équitable des weekends ?">
        <Cb on={cfg.weekendEquitable} set={v => set({ weekendEquitable: v }, true)} />
      </Q>
      <Q label="Répartition équitable des repos ?">
        <Cb on={cfg.reposEquitable} set={v => set({ reposEquitable: v }, true)} />
      </Q>
      {cfg.reposEquitable && <>
        <Q label="Limiter les repos consécutifs ?" sub>
          <Cb on={cfg.reposConsecutifsMax > 0} set={v => set({ reposConsecutifsMax: v ? 2 : 0 }, true)} />
        </Q>
        {cfg.reposConsecutifsMax > 0 && (
          <Q label="Maximum" sub2>
            <Ni value={cfg.reposConsecutifsMax} min={1} max={7} unit="jours" onChange={v => set({ reposConsecutifsMax: v })} onBlur={flush} />
          </Q>
        )}
      </>}
      <Q label="Horaires fixes ?">
        <Cb on={cfg.horairesFixes} set={v => set({ horairesFixes: v }, true)} />
      </Q>

      {/* ── Postes & avantages ───────────────────────────────────── */}
      <S label="Postes & avantages" />

      {/* Liste des postes */}
      <div className="border-b border-border/25 py-2.5 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {cfg.postes.map(p => (
            <span key={p} className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2.5 py-0.5 text-[11px]">
              {p}
              <button type="button" onClick={() => {
                const next = { postes: cfg.postes.filter(x => x !== p), postesTournants: cfg.postesTournants.filter(x => x !== p) };
                set(next, true);
              }}>
                <X className="h-2.5 w-2.5 text-muted-foreground/50 hover:text-foreground" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            value={newPoste}
            onChange={e => setNewPoste(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (() => {
              const t = newPoste.trim();
              if (t && !cfg.postes.includes(t)) { set({ postes: [...cfg.postes, t] }, true); setNewPoste(""); }
            })()}
            placeholder="Ajouter un poste…"
            className="flex-1 rounded-md border border-border/40 bg-background px-2.5 py-1 text-[12px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring/30"
          />
          <button
            onClick={() => {
              const t = newPoste.trim();
              if (t && !cfg.postes.includes(t)) { set({ postes: [...cfg.postes, t] }, true); setNewPoste(""); }
            }}
            className="rounded-md border border-border/40 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      <Q label="Les postes tournent-ils ?">
        <Cb on={cfg.postesTournent} set={v => set({ postesTournent: v }, true)} />
      </Q>
      {cfg.postesTournent && (
        <Q label="Lesquels ?" sub>
          <div className="flex flex-wrap gap-1">
            {cfg.postes.map(p => {
              const on = cfg.postesTournants.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    const list = on ? cfg.postesTournants.filter(x => x !== p) : [...cfg.postesTournants, p];
                    set({ postesTournants: list }, true);
                  }}
                  className={cn(
                    "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                    on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </Q>
      )}
      <Q label="Repas du personnel inclus ?">
        <Cb on={cfg.repasPersonnel} set={v => set({ repasPersonnel: v }, true)} />
      </Q>

      {/* ── Contraintes légales ──────────────────────────────────── */}
      <S label="Contraintes légales" />

      <Q label="Personnaliser les contraintes ?">
        <Cb on={showLegal} set={setShowLegal} />
      </Q>
      {showLegal && <>
        <Q label="Repos minimum entre deux services" sub>
          <Ni value={cfg.reposEntreServicesH} min={8} max={16} unit="h" onChange={v => set({ reposEntreServicesH: v })} onBlur={flush} />
        </Q>
        <Q label="Jours consécutifs maximum" sub>
          <Ni value={cfg.joursConsecutifsMax} min={3} max={6} unit="j" onChange={v => set({ joursConsecutifsMax: v })} onBlur={flush} />
        </Q>
        <Q label="Heures contrat par semaine" sub>
          <Ni value={cfg.heuresContratHebdo} min={20} max={48} unit="h" onChange={v => set({ heuresContratHebdo: v })} onBlur={flush} />
        </Q>
      </>}

    </div>
  );
}
