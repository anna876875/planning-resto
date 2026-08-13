import { redirect } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SECTEUR_LABELS, TAILLE_LABELS } from "@/types/onboarding";
import type { Secteur, TailleEquipe } from "@/types/onboarding";
import Link from "next/link";

export default async function ConfirmationPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

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

  const { data: membres } = await supabase
    .from("team_members")
    .select("prenom, nom, role, statut_contractuel")
    .eq("restaurant_id", restaurant?.id ?? "");

  const secteurInfo = restaurant?.secteur ? SECTEUR_LABELS[restaurant.secteur as Secteur] : null;

  const tailleInfo = restaurant?.taille_equipe
    ? TAILLE_LABELS[restaurant.taille_equipe as TailleEquipe]
    : null;

  return (
    <div className="space-y-8">
      {/* En-tête succès */}
      <div className="text-center">
        <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <CheckCircle className="text-primary h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">Bienvenue, {profile?.full_name?.split(" ")[0]} !</h1>
        <p className="text-muted-foreground mt-1">Votre espace est prêt. Voici un récapitulatif.</p>
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

        {membres && membres.length > 0 && (
          <Card>
            <CardContent className="px-5 py-4">
              <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
                Équipe ({membres.length} membre{membres.length > 1 ? "s" : ""})
              </p>
              <ul className="space-y-1.5">
                {membres.map((m, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {m.prenom} {m.nom}
                    </span>
                    <span className="text-muted-foreground">{m.role}</span>
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
