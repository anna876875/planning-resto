// Config de génération du planning — persistée dans localStorage

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

  // ── Effectifs ────────────────────────────────────────────────
  effectifs: { stable: number; affluence: number };

  // ── Règles de repos ──────────────────────────────────────────
  reposEquitable:       boolean;
  reposConsecutifsMax:  number; // ≠ congés payés

  // ── Horaires ─────────────────────────────────────────────────
  horairesFixes: boolean;
  // jour (0=Dim … 6=Sam) → liste de services actifs ce jour
  disponibilites: Record<number, string[]>;

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
  coupure: { debut: "15:00", fin: "19:00" },
  effectifs: { stable: 10, affluence: 12 },
  reposEquitable: true,
  reposConsecutifsMax: 2,
  horairesFixes: false,
  disponibilites: {
    1: ["ouverture", "midi", "soir"], // Lun
    2: ["ouverture", "midi", "soir"], // Mar
    3: ["ouverture", "midi", "soir"], // Mer
    4: ["ouverture", "midi", "soir"], // Jeu
    5: ["ouverture", "midi", "soir"], // Ven
    6: ["ouverture", "midi", "soir"], // Sam
    0: [],                            // Dim — fermé
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
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(cfg: PlanningConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}
