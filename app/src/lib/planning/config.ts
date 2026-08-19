// Configuration complète pour la génération de plannings

export type RoleKey = "chef_cuisine" | "chef_partie" | "serveur" | "barman" | "plongeur";

export interface ServiceConfig {
  actif:  boolean;
  debut:  string; // "HH:mm"
  fin:    string;
}

export interface PlanningConfig {
  // ── Horaires de services ──────────────────────────────────────
  services: {
    ouverture: ServiceConfig;
    midi:      ServiceConfig;
    soir:      ServiceConfig;
  };

  // ── Coupure ──────────────────────────────────────────────────
  coupure: { debut: string; fin: string };

  // ── Effectifs totaux par période ─────────────────────────────
  effectifs: { stable: number; affluence: number };

  // ── Effectifs minimum par service ────────────────────────────
  effectifsParService: {
    ouverture: number;
    midi:      number;
    soir:      number;
  };

  // ── Rôles minimum requis par service ─────────────────────────
  // Clé = role, valeur = nombre minimum requis
  rolesParService: {
    ouverture: Partial<Record<RoleKey, number>>;
    midi:      Partial<Record<RoleKey, number>>;
    soir:      Partial<Record<RoleKey, number>>;
  };

  // ── Contraintes légales ───────────────────────────────────────
  reposEntreServicesH:  number; // repos minimum entre 2 services (légal FR: 11h)
  joursConsecutifsMax:  number; // max jours travaillés d'affilée (légal FR: 6)
  joursReposParSemaine: number; // jours de repos/semaine (légal FR: min 1)
  heuresContratHebdo:   number; // heures contractuelles / semaine (ex: 39h)
  heuresMaxParJour:     number; // durée max d'un service (légal FR: 10h)

  // ── Équité & préférences ──────────────────────────────────────
  weekendEquitable:  boolean; // rotation équitable des week-ends
  reposEquitable:    boolean; // distribution équitable des jours de repos
  reposConsecutifsMax: number; // repos consécutifs max (≠ congés)

  // ── Disponibilités hebdomadaires ─────────────────────────────
  horairesFixes: boolean;
  disponibilites: Record<number, string[]>; // jsDay -> services actifs

  // ── Postes ───────────────────────────────────────────────────
  postes:          string[];
  postesTournent:  boolean;
  postesTournants: string[];

  // ── Avantages ────────────────────────────────────────────────
  repasPersonnel: boolean;
}

export const DEFAULT_CONFIG: PlanningConfig = {
  services: {
    ouverture: { actif: true,  debut: "07:00", fin: "15:00" },
    midi:      { actif: true,  debut: "11:00", fin: "19:00" },
    soir:      { actif: true,  debut: "15:00", fin: "23:00" },
  },
  coupure:  { debut: "15:00", fin: "19:00" },
  effectifs: { stable: 10, affluence: 13 },

  // Composition cible par service
  effectifsParService: { ouverture: 2, midi: 5, soir: 8 },
  rolesParService: {
    ouverture: { chef_cuisine: 1, plongeur: 1 },
    midi:      { chef_cuisine: 1, serveur: 2, barman: 1, plongeur: 1 },
    soir:      { chef_partie: 1, serveur: 3, barman: 1, plongeur: 1 },
  },

  // Légalité (droit du travail français)
  reposEntreServicesH:  11,
  joursConsecutifsMax:  6,
  joursReposParSemaine: 2,
  heuresContratHebdo:   39,
  heuresMaxParJour:     10,

  // Équité
  weekendEquitable:    true,
  reposEquitable:      true,
  reposConsecutifsMax: 2,

  // Disponibilités
  horairesFixes: true,
  disponibilites: {
    1: ["ouverture", "midi", "soir"],
    2: ["ouverture", "midi", "soir"],
    3: ["ouverture", "midi", "soir"],
    4: ["ouverture", "midi", "soir"],
    5: ["ouverture", "midi", "soir"],
    6: ["ouverture", "midi", "soir"],
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
    // Deep merge pour préserver les nouveaux champs par défaut
    const saved = JSON.parse(raw) as Partial<PlanningConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...saved,
      services:            { ...DEFAULT_CONFIG.services,            ...saved.services            },
      effectifs:           { ...DEFAULT_CONFIG.effectifs,           ...saved.effectifs           },
      effectifsParService: { ...DEFAULT_CONFIG.effectifsParService, ...saved.effectifsParService },
      rolesParService: {
        ouverture: { ...DEFAULT_CONFIG.rolesParService.ouverture, ...saved.rolesParService?.ouverture },
        midi:      { ...DEFAULT_CONFIG.rolesParService.midi,      ...saved.rolesParService?.midi      },
        soir:      { ...DEFAULT_CONFIG.rolesParService.soir,      ...saved.rolesParService?.soir      },
      },
      disponibilites: { ...DEFAULT_CONFIG.disponibilites, ...saved.disponibilites },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(cfg: PlanningConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}
