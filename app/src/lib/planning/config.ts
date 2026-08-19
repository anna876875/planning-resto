// Configuration complète pour la génération de plannings

export interface ServiceConfig {
  actif: boolean;
  debut: string; // "HH:mm"
  fin: string;
  effectifStable: number;
  effectifAffluence: number;
  joursAffluence: number[]; // JS weekday indices (1=Lun…6=Sam, 0=Dim)
}

export interface PlanningConfig {
  // ── Services ─────────────────────────────────────────────────
  services: {
    matin: ServiceConfig;
    soir:  ServiceConfig;
  };
  coupure: { debut: string; fin: string };

  // ── Contraintes légales ───────────────────────────────────────
  reposEntreServicesH:  number; // repos minimum entre 2 services (légal FR: 11h)
  joursConsecutifsMax:  number; // max jours travaillés d'affilée (légal FR: 6)
  joursReposParSemaine: number; // jours de repos/semaine (légal FR: min 1)
  heuresContratHebdo:   number; // heures contractuelles / semaine (ex: 39h)
  heuresMaxParJour:     number; // durée max d'un service (légal FR: 10h)

  // ── Équité & préférences ──────────────────────────────────────
  weekendEquitable:    boolean;
  reposEquitable:      boolean;
  reposConsecutifsMax: number;

  // ── Disponibilités hebdomadaires ─────────────────────────────
  horairesFixes:   boolean;
  disponibilites:  Record<number, string[]>; // jsDay → ["matin","soir"]

  // ── Postes ───────────────────────────────────────────────────
  postes:          string[];
  postesTournent:  boolean;
  postesTournants: string[];

  // ── Avantages ────────────────────────────────────────────────
  repasPersonnel: boolean;
}

export const DEFAULT_CONFIG: PlanningConfig = {
  services: {
    matin: { actif: true, debut: "08:00", fin: "16:00", effectifStable: 4, effectifAffluence: 6,  joursAffluence: [5, 6] },
    soir:  { actif: true, debut: "18:00", fin: "23:00", effectifStable: 6, effectifAffluence: 10, joursAffluence: [5, 6] },
  },
  coupure: { debut: "16:00", fin: "18:00" },

  reposEntreServicesH:  11,
  joursConsecutifsMax:  6,
  joursReposParSemaine: 2,
  heuresContratHebdo:   39,
  heuresMaxParJour:     10,

  weekendEquitable:    true,
  reposEquitable:      true,
  reposConsecutifsMax: 2,

  horairesFixes: true,
  disponibilites: {
    1: ["matin", "soir"],
    2: ["matin", "soir"],
    3: ["matin", "soir"],
    4: ["matin", "soir"],
    5: ["matin", "soir"],
    6: ["matin", "soir"],
    0: [],
  },

  postes:          ["Chef cuisine", "Chef de partie", "Serveur", "Barman", "Plongeur"],
  postesTournent:  false,
  postesTournants: [],
  repasPersonnel:  true,
};

const KEY = "planning_config";

export function loadConfig(): PlanningConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CONFIG;
    const saved = JSON.parse(raw) as Record<string, unknown>;
    const savedSvcs = (saved.services ?? {}) as Record<string, unknown>;
    return {
      ...DEFAULT_CONFIG,
      ...saved,
      services: {
        matin: { ...DEFAULT_CONFIG.services.matin, ...(savedSvcs.matin as Partial<ServiceConfig> ?? {}) },
        soir:  { ...DEFAULT_CONFIG.services.soir,  ...(savedSvcs.soir  as Partial<ServiceConfig> ?? {}) },
      },
      coupure:        { ...DEFAULT_CONFIG.coupure,        ...(saved.coupure        as Partial<PlanningConfig["coupure"]>        ?? {}) },
      disponibilites: { ...DEFAULT_CONFIG.disponibilites, ...(saved.disponibilites as PlanningConfig["disponibilites"] ?? {}) },
    } as PlanningConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(cfg: PlanningConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}
