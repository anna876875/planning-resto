"use client";

import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SECTEUR_LABELS, TAILLE_LABELS, STATUT_LABELS } from "@/types/onboarding";
import type { Secteur, TailleEquipe, StatutContractuel } from "@/types/onboarding";
import Link from "next/link";

interface MembreResume {
  prenom: string;
  nom: string;
  role: string;
  statutContractuel: string;
}

interface ConfirmationData {
  prenom: string | null;
  secteur: string | null;
  taille: string | null;
  membres: MembreResume[];
}

export default function ConfirmationPage() {
  const [data, setData] = useState<ConfirmationData>({
    prenom: null,
    secteur: null,
    taille: null,
    membres: [],
  });

  useEffect(() => {
    async function charger() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("id, secteur, taille_equipe")
          .eq("owner_id", user.id)
          .single();

        let membres: MembreResume[] = [];
        if (restaurant?.id) {
          const { data: m } = await supabase
            .from("team_members")
            .select("prenom, nom, role, statut_contractuel")
            .eq("restaurant_id", restaurant.id);
          membres = (m ?? []).map((row) => ({
            prenom: row.prenom,
            nom: row.nom,
            role: row.role,
            statutContractuel: row.statut_contractuel,
          }));
        }

        setData({
          prenom: profile?.full_name?.split(" ")[0] ?? null,
          secteur: restaurant?.secteur ?? null,
          taille: restaurant?.taille_equipe ?? null,
          membres,
        });
      } else {
        const membresRaw = sessionStorage.getItem("demo_membres");
        setData({
          prenom: null,
          secteur: sessionStorage.getItem("demo_secteur"),
          taille: sessionStorage.getItem("demo_taille"),
          membres: membresRaw
            ? (JSON.parse(membresRaw) as MembreResume[]).map((m) => ({
                prenom: m.prenom,
                nom: m.nom,
                role: m.role,
                statutContractuel: m.statutContractuel,
              }))
            : [],
        });
      }
    }

    charger();
  }, []);

  const secteurInfo = data.secteur ? SECTEUR_LABELS[data.secteur as Secteur] : null;
  const tailleInfo = data.taille ? TAILLE_LABELS[data.taille as TailleEquipe] : null;

  return (
    <div className="space-y-8">
      {/* En-tête succès */}
      <div className="text-center">
        <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <CheckCircle className="text-primary h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">
          {data.prenom ? `Bienvenue, ${data.prenom} !` : "Votre espace est prêt !"}
        </h1>
        <p className="text-muted-foreground mt-1">Voici un récapitulatif de votre configuration.</p>
      </div>

      {/* Récapitulatif */}
      <div className="space-y-3">
        {secteurInfo && (
          <Card>
            <CardContent className="flex items-center gap-4 px-5 py-4">
              <span className="text-3xl">{secteurInfo.emoji}</span>
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Secteur
                </p>
                <p className="font-medium">{secteurInfo.label}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {tailleInfo && (
          <Card>
            <CardContent className="flex items-center gap-4 px-5 py-4">
              <span className="text-3xl">👥</span>
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Taille d&apos;équipe
                </p>
                <p className="font-medium">{tailleInfo.label} personnes</p>
              </div>
            </CardContent>
          </Card>
        )}

        {data.membres.length > 0 && (
          <Card>
            <CardContent className="px-5 py-4">
              <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
                Équipe ({data.membres.length} membre{data.membres.length > 1 ? "s" : ""})
              </p>
              <ul className="space-y-1.5">
                {data.membres.map((m, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {m.prenom} {m.nom}
                    </span>
                    <span className="text-muted-foreground">
                      {STATUT_LABELS[m.statutContractuel as StatutContractuel] ??
                        m.statutContractuel}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <Link href="/planning" className={buttonVariants({ size: "lg", className: "w-full" })}>
        Accéder à mon planning →
      </Link>
    </div>
  );
}
