"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Plus, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  loadConfig,
  saveConfig,
  loadConfigFromServer,
  saveConfigToServer,
  DEFAULT_CONFIG,
  type PlanningConfig,
  type ServiceConfig,
} from "@/lib/planning/config";

// ─── Primitives ──────────────────────────────────────────────────────────────

function Cb({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => set(!on)}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
        on ? "bg-primary border-primary" : "border-border hover:border-primary/50"
      )}
    >
      {on && <Check className="h-3 w-3 text-white" />}
    </button>
  );
}

function Ti({
  value,
  onChange,
  onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className="border-border bg-muted/30 focus:ring-ring/40 focus:bg-background w-24 rounded-lg border px-3 py-1.5 text-sm tabular-nums focus:ring-2 focus:outline-none"
    />
  );
}

function Ni({
  value,
  onChange,
  onBlur,
  min = 1,
  max = 99,
  unit,
  w = "w-16",
}: {
  value: number;
  onChange: (v: number) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  unit?: string;
  w?: string;
}) {
  return (
    <>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        onBlur={onBlur}
        className={cn(
          "border-border bg-muted/30 focus:ring-ring/40 focus:bg-background rounded-lg border px-3 py-1.5 text-center text-sm tabular-nums focus:ring-2 focus:outline-none",
          w
        )}
      />
      {unit && <span className="text-muted-foreground text-sm">{unit}</span>}
    </>
  );
}

// Question row
function Q({
  label,
  sub = false,
  sub2 = false,
  children,
}: {
  label: string;
  sub?: boolean;
  sub2?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-border/30 flex min-h-12 items-center justify-between gap-6 border-b py-3",
        sub2 ? "pl-12" : sub ? "pl-6" : ""
      )}
    >
      <span
        className={cn(
          "text-sm leading-snug",
          sub2 ? "text-muted-foreground/70" : sub ? "text-muted-foreground" : "font-medium"
        )}
      >
        {label}
      </span>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

// Day pills
const JOURS_SHORT = [
  { idx: 1, s: "Lun" },
  { idx: 2, s: "Mar" },
  { idx: 3, s: "Mer" },
  { idx: 4, s: "Jeu" },
  { idx: 5, s: "Ven" },
  { idx: 6, s: "Sam" },
  { idx: 0, s: "Dim" },
];
function Days({ sel, set }: { sel: number[]; set: (v: number[]) => void }) {
  return (
    <div className="flex gap-1.5">
      {JOURS_SHORT.map(({ idx, s }) => {
        const on = sel.includes(idx);
        return (
          <button
            key={idx}
            type="button"
            onClick={() => set(on ? sel.filter((d) => d !== idx) : [...sel, idx])}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
              on
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

// Accordion
function Accordion({
  title,
  open,
  onToggle,
  children,
  summary,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  summary?: string;
}) {
  return (
    <div className="border-border mb-3 overflow-hidden rounded-xl border">
      <button
        type="button"
        onClick={onToggle}
        className="bg-card hover:bg-muted/20 flex w-full items-center justify-between px-5 py-4 transition-colors"
      >
        <span className="text-base font-semibold">{title}</span>
        <div className="flex items-center gap-3">
          {summary && <span className="text-muted-foreground text-sm">{summary}</span>}
          <ChevronDown
            className={cn(
              "text-muted-foreground h-4 w-4 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </div>
      </button>
      {open && <div className="border-border/40 border-t px-5 pb-2">{children}</div>}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const JOURS_TABLE = [
  { idx: 1, l: "Lundi" },
  { idx: 2, l: "Mardi" },
  { idx: 3, l: "Mercredi" },
  { idx: 4, l: "Jeudi" },
  { idx: 5, l: "Vendredi" },
  { idx: 6, l: "Samedi" },
  { idx: 0, l: "Dimanche" },
];

export default function ParametresPage() {
  const [cfg, setCfg] = useState<PlanningConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [newPoste, setNewPoste] = useState("");
  const [open, setOpen] = useState<string>("jours");
  const ref = useRef<PlanningConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    // Essaie d'abord le serveur (Supabase), sinon localStorage
    void loadConfigFromServer().then((serverCfg) => {
      const c = serverCfg ?? loadConfig();
      ref.current = c;
      setCfg(c);
      // Synchronise localStorage avec la version serveur
      if (serverCfg) saveConfig(serverCfg);
    });
  }, []);

  function persist(next: PlanningConfig) {
    saveConfig(next);
    void saveConfigToServer(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1100);
  }

  function set(patch: Partial<PlanningConfig>, now = false) {
    const next = { ...ref.current, ...patch };
    ref.current = next;
    setCfg(next);
    if (now) persist(next);
  }

  function setSvc(key: "matin" | "soir", patch: Partial<ServiceConfig>, now = false) {
    const next = {
      ...ref.current,
      services: { ...ref.current.services, [key]: { ...ref.current.services[key], ...patch } },
    };
    ref.current = next;
    setCfg(next);
    if (now) persist(next);
  }

  function flush() {
    persist(ref.current);
  }

  function toggleDay(dayIdx: number) {
    const cur = ref.current.disponibilites[dayIdx] ?? [];
    const isOpen = cur.length > 0;
    const svcs = isOpen
      ? []
      : [
          ...(ref.current.services.matin.actif ? ["matin"] : []),
          ...(ref.current.services.soir.actif ? ["soir"] : []),
        ];
    set(
      {
        disponibilites: {
          ...ref.current.disponibilites,
          [dayIdx]: svcs.length ? svcs : ["matin", "soir"],
        },
      },
      true
    );
  }

  function toggle(key: string) {
    setOpen((o) => (o === key ? "" : key));
  }

  const m = cfg.services.matin;
  const s = cfg.services.soir;

  const joursOuverts =
    JOURS_TABLE.filter(({ idx }) => (cfg.disponibilites[idx] ?? []).length > 0)
      .map((d) => d.l)
      .join(", ") || "Aucun";

  return (
    <div className="px-4 py-4 md:px-6">
      {/* Titre */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Configuration</h1>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <Check className="h-4 w-4" /> Enregistré
          </span>
        )}
      </div>

      {/* ── 1. Jours d'ouverture ─────────────────────────────────── */}
      <Accordion
        title="Jours d'ouverture"
        open={open === "jours"}
        onToggle={() => toggle("jours")}
        summary={open !== "jours" ? joursOuverts : undefined}
      >
        <div className="space-y-4 py-4">
          <p className="text-muted-foreground text-sm">
            Sélectionnez les jours où votre restaurant accueille des clients.
          </p>
          <div className="flex flex-wrap gap-3">
            {JOURS_TABLE.map(({ idx, l }) => {
              const isOpen = (cfg.disponibilites[idx] ?? []).length > 0;
              return (
                <label key={idx} className="flex cursor-pointer items-center gap-2.5 select-none">
                  <button
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                      isOpen ? "bg-primary border-primary" : "border-border hover:border-primary/50"
                    )}
                  >
                    {isOpen && <Check className="h-3 w-3 text-white" />}
                  </button>
                  <span className="text-sm font-medium">{l}</span>
                </label>
              );
            })}
          </div>
        </div>
      </Accordion>

      {/* ── 2. Services & Horaires ───────────────────────────────── */}
      <Accordion
        title="Services & Horaires"
        open={open === "services"}
        onToggle={() => toggle("services")}
        summary={
          open !== "services"
            ? [m.actif && "Matin", s.actif && "Soir"].filter(Boolean).join(" · ") || "Aucun service"
            : undefined
        }
      >
        {/* Matin */}
        <div className="pt-4 pb-2">
          <p className="text-muted-foreground/60 mb-2 text-xs font-semibold tracking-widest uppercase">
            Matin
          </p>
          <Q label="Service matin actif ?">
            <Cb on={m.actif} set={(v) => setSvc("matin", { actif: v }, true)} />
          </Q>
          {m.actif && (
            <>
              <Q label="Horaires" sub>
                <Ti
                  value={m.debut}
                  onChange={(v) => setSvc("matin", { debut: v })}
                  onBlur={flush}
                />
                <span className="text-muted-foreground/50 text-sm">→</span>
                <Ti value={m.fin} onChange={(v) => setSvc("matin", { fin: v })} onBlur={flush} />
              </Q>
              <Q label="Effectif par service" sub>
                <Ni
                  value={m.effectifStable}
                  min={1}
                  max={30}
                  unit="pers."
                  onChange={(v) => setSvc("matin", { effectifStable: v })}
                  onBlur={flush}
                />
              </Q>
              <Q label="Jours d'affluence ?" sub>
                <Cb
                  on={m.joursAffluence.length > 0}
                  set={(v) => setSvc("matin", { joursAffluence: v ? [5, 6] : [] }, true)}
                />
              </Q>
              {m.joursAffluence.length > 0 && (
                <>
                  <Q label="Jours concernés" sub2>
                    <Days
                      sel={m.joursAffluence}
                      set={(d) => setSvc("matin", { joursAffluence: d }, true)}
                    />
                  </Q>
                  <Q label="Effectif ces jours-là" sub2>
                    <Ni
                      value={m.effectifAffluence}
                      min={m.effectifStable}
                      max={30}
                      unit="pers."
                      onChange={(v) => setSvc("matin", { effectifAffluence: v })}
                      onBlur={flush}
                    />
                  </Q>
                </>
              )}
            </>
          )}
        </div>

        {/* Soir */}
        <div className="pt-4 pb-2">
          <p className="text-muted-foreground/60 mb-2 text-xs font-semibold tracking-widest uppercase">
            Soir
          </p>
          <Q label="Service soir actif ?">
            <Cb on={s.actif} set={(v) => setSvc("soir", { actif: v }, true)} />
          </Q>
          {s.actif && (
            <>
              <Q label="Horaires" sub>
                <Ti value={s.debut} onChange={(v) => setSvc("soir", { debut: v })} onBlur={flush} />
                <span className="text-muted-foreground/50 text-sm">→</span>
                <Ti value={s.fin} onChange={(v) => setSvc("soir", { fin: v })} onBlur={flush} />
              </Q>
              <Q label="Effectif par service" sub>
                <Ni
                  value={s.effectifStable}
                  min={1}
                  max={30}
                  unit="pers."
                  onChange={(v) => setSvc("soir", { effectifStable: v })}
                  onBlur={flush}
                />
              </Q>
              <Q label="Jours d'affluence ?" sub>
                <Cb
                  on={s.joursAffluence.length > 0}
                  set={(v) => setSvc("soir", { joursAffluence: v ? [5, 6] : [] }, true)}
                />
              </Q>
              {s.joursAffluence.length > 0 && (
                <>
                  <Q label="Jours concernés" sub2>
                    <Days
                      sel={s.joursAffluence}
                      set={(d) => setSvc("soir", { joursAffluence: d }, true)}
                    />
                  </Q>
                  <Q label="Effectif ces jours-là" sub2>
                    <Ni
                      value={s.effectifAffluence}
                      min={s.effectifStable}
                      max={30}
                      unit="pers."
                      onChange={(v) => setSvc("soir", { effectifAffluence: v })}
                      onBlur={flush}
                    />
                  </Q>
                </>
              )}
            </>
          )}
        </div>

        {/* Coupure */}
        <div className="pt-4 pb-2">
          <p className="text-muted-foreground/60 mb-2 text-xs font-semibold tracking-widest uppercase">
            Coupure
          </p>
          <Q label="Horaires de la coupure inter-services">
            <Ti
              value={cfg.coupure.debut}
              onChange={(v) => set({ coupure: { ...cfg.coupure, debut: v } })}
              onBlur={flush}
            />
            <span className="text-muted-foreground/50 text-sm">→</span>
            <Ti
              value={cfg.coupure.fin}
              onChange={(v) => set({ coupure: { ...cfg.coupure, fin: v } })}
              onBlur={flush}
            />
          </Q>
        </div>
      </Accordion>

      {/* ── 3. Planning & Repos ──────────────────────────────────── */}
      <Accordion
        title="Planning & Repos"
        open={open === "planning"}
        onToggle={() => toggle("planning")}
        summary={open !== "planning" ? `${cfg.joursReposParSemaine} j de repos / sem.` : undefined}
      >
        <div className="py-2">
          <Q label="Jours de repos par semaine">
            <Ni
              value={cfg.joursReposParSemaine}
              min={1}
              max={3}
              unit="jours"
              onChange={(v) => set({ joursReposParSemaine: v })}
              onBlur={flush}
            />
          </Q>
          <Q label="Répartition équitable des weekends ?">
            <Cb on={cfg.weekendEquitable} set={(v) => set({ weekendEquitable: v }, true)} />
          </Q>
          <Q label="Répartition équitable des repos ?">
            <Cb on={cfg.reposEquitable} set={(v) => set({ reposEquitable: v }, true)} />
          </Q>
          {cfg.reposEquitable && (
            <>
              <Q label="Limiter les repos consécutifs ?" sub>
                <Cb
                  on={cfg.reposConsecutifsMax > 0}
                  set={(v) => set({ reposConsecutifsMax: v ? 2 : 0 }, true)}
                />
              </Q>
              {cfg.reposConsecutifsMax > 0 && (
                <Q label="Nombre maximum" sub2>
                  <Ni
                    value={cfg.reposConsecutifsMax}
                    min={1}
                    max={7}
                    unit="jours d'affilée"
                    onChange={(v) => set({ reposConsecutifsMax: v })}
                    onBlur={flush}
                  />
                </Q>
              )}
            </>
          )}
          <Q label="Horaires fixes ?">
            <Cb on={cfg.horairesFixes} set={(v) => set({ horairesFixes: v }, true)} />
          </Q>
        </div>
      </Accordion>

      {/* ── 4. Postes & Avantages ────────────────────────────────── */}
      <Accordion
        title="Postes & Avantages"
        open={open === "postes"}
        onToggle={() => toggle("postes")}
        summary={
          open !== "postes"
            ? `${cfg.postes.length} poste${cfg.postes.length > 1 ? "s" : ""}`
            : undefined
        }
      >
        <div className="space-y-4 py-4">
          {/* Liste des postes */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Postes de l&apos;établissement</p>
            <div className="flex flex-wrap gap-2">
              {cfg.postes.map((p) => (
                <span
                  key={p}
                  className="border-border bg-muted/40 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm"
                >
                  {p}
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        {
                          postes: cfg.postes.filter((x) => x !== p),
                          postesTournants: cfg.postesTournants.filter((x) => x !== p),
                        },
                        true
                      )
                    }
                  >
                    <X className="text-muted-foreground/60 hover:text-foreground h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newPoste}
                onChange={(e) => setNewPoste(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const t = newPoste.trim();
                  if (t && !cfg.postes.includes(t)) {
                    set({ postes: [...cfg.postes, t] }, true);
                    setNewPoste("");
                  }
                }}
                placeholder="Ajouter un poste…"
                className="border-border bg-background placeholder:text-muted-foreground/50 focus:ring-ring/40 flex-1 rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              />
              <button
                onClick={() => {
                  const t = newPoste.trim();
                  if (t && !cfg.postes.includes(t)) {
                    set({ postes: [...cfg.postes, t] }, true);
                    setNewPoste("");
                  }
                }}
                className="border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg border px-3 py-2 text-sm transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="border-border/30 border-t pt-2">
            <Q label="Les postes tournent-ils ?">
              <Cb on={cfg.postesTournent} set={(v) => set({ postesTournent: v }, true)} />
            </Q>
            {cfg.postesTournent && (
              <Q label="Postes concernés" sub>
                <div className="flex flex-wrap gap-1.5">
                  {cfg.postes.map((p) => {
                    const on = cfg.postesTournants.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          set(
                            {
                              postesTournants: on
                                ? cfg.postesTournants.filter((x) => x !== p)
                                : [...cfg.postesTournants, p],
                            },
                            true
                          )
                        }
                        className={cn(
                          "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
                          on
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
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
              <Cb on={cfg.repasPersonnel} set={(v) => set({ repasPersonnel: v }, true)} />
            </Q>
          </div>
        </div>
      </Accordion>

      {/* ── 5. Contraintes légales ───────────────────────────────── */}
      <Accordion
        title="Contraintes légales"
        open={open === "legal"}
        onToggle={() => toggle("legal")}
        summary={open !== "legal" ? "Droit du travail FR" : undefined}
      >
        <div className="py-2">
          <p className="text-muted-foreground py-3 text-sm">
            Modifiez uniquement si votre convention collective le permet.
          </p>
          <Q label="Repos minimum entre deux services">
            <Ni
              value={cfg.reposEntreServicesH}
              min={8}
              max={16}
              unit="h min."
              onChange={(v) => set({ reposEntreServicesH: v })}
              onBlur={flush}
            />
          </Q>
          <Q label="Jours consécutifs maximum">
            <Ni
              value={cfg.joursConsecutifsMax}
              min={3}
              max={6}
              unit="jours"
              onChange={(v) => set({ joursConsecutifsMax: v })}
              onBlur={flush}
            />
          </Q>
          <Q label="Heures contractuelles par semaine">
            <Ni
              value={cfg.heuresContratHebdo}
              min={20}
              max={48}
              unit="h"
              onChange={(v) => set({ heuresContratHebdo: v })}
              onBlur={flush}
            />
          </Q>
        </div>
      </Accordion>
    </div>
  );
}
