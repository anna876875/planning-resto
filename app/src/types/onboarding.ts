export type OnboardingStep = "secteur" | "equipe" | "membres" | "done";

export type Secteur =
  | "restaurant_traditionnel"
  | "brasserie_bistrot"
  | "fast_food"
  | "cafe_salon_the"
  | "bar_cocktails"
  | "hotel_restaurant"
  | "food_truck"
  | "traiteur"
  | "boulangerie_patisserie"
  | "pizzeria"
  | "gastronomique"
  | "autre";

export type TailleEquipe = "1_5" | "6_15" | "16_30" | "31_50" | "50_plus";

export type StatutContractuel =
  | "extra"
  | "etudiant"
  | "cdi_temps_plein"
  | "cdi_mi_temps"
  | "cdd"
  | "apprenti_alternant"
  | "saisonnier"
  | "interimaire";

export type JourSemaine = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Indisponibilite {
  type: "recurrent" | "ponctuel";
  jourSemaine?: JourSemaine;
  date?: string;
  heureDebut?: string;
  heureFin?: string;
}

export interface MembreEquipe {
  id: string;
  prenom: string;
  nom: string;
  role: string;
  statutContractuel: StatutContractuel;
  heuresParSemaine: number;
  indisponibilites: Indisponibilite[];
}

// ─── Labels affichés dans l'UI ───────────────────────────────────────────────

export const SECTEUR_LABELS: Record<Secteur, { label: string; emoji: string }> = {
  restaurant_traditionnel: { label: "Restaurant traditionnel", emoji: "🍽️" },
  brasserie_bistrot: { label: "Brasserie / Bistrot", emoji: "🍺" },
  fast_food: { label: "Fast-food", emoji: "🍔" },
  cafe_salon_the: { label: "Café / Salon de thé", emoji: "☕" },
  bar_cocktails: { label: "Bar / Bar à cocktails", emoji: "🍸" },
  hotel_restaurant: { label: "Hôtel-restaurant", emoji: "🏨" },
  food_truck: { label: "Food truck", emoji: "🚐" },
  traiteur: { label: "Traiteur / Banquet", emoji: "🥂" },
  boulangerie_patisserie: { label: "Boulangerie-pâtisserie", emoji: "🥐" },
  pizzeria: { label: "Pizzeria", emoji: "🍕" },
  gastronomique: { label: "Restaurant gastronomique", emoji: "⭐" },
  autre: { label: "Autre", emoji: "🍴" },
};

export const TAILLE_LABELS: Record<TailleEquipe, { label: string; description: string }> = {
  "1_5": { label: "1 – 5", description: "Très petite équipe" },
  "6_15": { label: "6 – 15", description: "Petite équipe" },
  "16_30": { label: "16 – 30", description: "Équipe moyenne" },
  "31_50": { label: "31 – 50", description: "Grande équipe" },
  "50_plus": { label: "50+", description: "Très grande équipe" },
};

export const STATUT_LABELS: Record<StatutContractuel, string> = {
  extra: "Extra (journée)",
  etudiant: "Étudiant",
  cdi_temps_plein: "CDI – Temps plein (35h)",
  cdi_mi_temps: "CDI – Mi-temps",
  cdd: "CDD",
  apprenti_alternant: "Apprenti / Alternant",
  saisonnier: "Saisonnier",
  interimaire: "Intérimaire",
};

export const JOURS_SEMAINE = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

export const STEPS: { key: OnboardingStep; label: string }[] = [
  { key: "secteur", label: "Secteur" },
  { key: "equipe", label: "Équipe" },
  { key: "membres", label: "Membres" },
];
