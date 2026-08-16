"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarDays, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Schémas de validation ───────────────────────────────────────────────────

const inscriptionSchema = z.object({
  nomComplet: z.string().min(2, "Veuillez saisir votre nom complet"),
  email: z.string().email("Adresse e-mail invalide"),
  motDePasse: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Doit contenir au moins une majuscule")
    .regex(/[0-9]/, "Doit contenir au moins un chiffre"),
});

const connexionSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  motDePasse: z.string().min(1, "Veuillez saisir votre mot de passe"),
});

type InscriptionData = z.infer<typeof inscriptionSchema>;
type ConnexionData = z.infer<typeof connexionSchema>;

// ─── Composant ───────────────────────────────────────────────────────────────

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"connexion" | "inscription">("inscription");
  const [erreurServeur, setErreurServeur] = useState<string | null>(null);

  const inscriptionForm = useForm<InscriptionData>({
    resolver: zodResolver(inscriptionSchema),
  });

  const connexionForm = useForm<ConnexionData>({
    resolver: zodResolver(connexionSchema),
  });

  async function onInscription(data: InscriptionData) {
    setErreurServeur(null);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.motDePasse,
      options: { data: { full_name: data.nomComplet } },
    });
    if (error) {
      setErreurServeur(
        error.message.includes("already registered")
          ? "Cette adresse e-mail est déjà utilisée."
          : "Une erreur est survenue. Réessayez."
      );
      return;
    }
    router.push("/onboarding/secteur");
  }

  async function onConnexion(data: ConnexionData) {
    setErreurServeur(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.motDePasse,
    });
    if (error) {
      setErreurServeur("Identifiants incorrects. Vérifiez votre e-mail et mot de passe.");
      return;
    }
    router.push("/onboarding/secteur");
  }

  function basculerMode() {
    setErreurServeur(null);
    setMode((m) => (m === "connexion" ? "inscription" : "connexion"));
  }

  const isLoading = inscriptionForm.formState.isSubmitting || connexionForm.formState.isSubmitting;

  return (
    <div className="bg-muted/30 flex min-h-screen flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <CalendarDays className="text-primary h-7 w-7" />
        <span className="text-xl font-bold">Planning Resto</span>
      </div>

      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {mode === "inscription" ? "Créer votre compte" : "Bon retour !"}
          </CardTitle>
          <CardDescription>
            {mode === "inscription"
              ? "Commencez à gérer votre équipe en 3 minutes."
              : "Connectez-vous pour accéder à votre planning."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Message d'erreur serveur */}
          {erreurServeur && (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm"
            >
              {erreurServeur}
            </div>
          )}

          {/* ── Formulaire Inscription ── */}
          {mode === "inscription" && (
            <form onSubmit={inscriptionForm.handleSubmit(onInscription)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nomComplet">Nom complet</Label>
                <Input
                  id="nomComplet"
                  placeholder="Marie Dupont"
                  autoComplete="name"
                  {...inscriptionForm.register("nomComplet")}
                />
                {inscriptionForm.formState.errors.nomComplet && (
                  <p className="text-destructive text-xs">
                    {inscriptionForm.formState.errors.nomComplet.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email-inscription">Adresse e-mail</Label>
                <Input
                  id="email-inscription"
                  type="email"
                  placeholder="marie@monrestaurant.fr"
                  autoComplete="email"
                  {...inscriptionForm.register("email")}
                />
                {inscriptionForm.formState.errors.email && (
                  <p className="text-destructive text-xs">
                    {inscriptionForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="motDePasse-inscription">Mot de passe</Label>
                <Input
                  id="motDePasse-inscription"
                  type="password"
                  placeholder="8 caractères min., 1 majuscule, 1 chiffre"
                  autoComplete="new-password"
                  {...inscriptionForm.register("motDePasse")}
                />
                {inscriptionForm.formState.errors.motDePasse && (
                  <p className="text-destructive text-xs">
                    {inscriptionForm.formState.errors.motDePasse.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer mon compte
              </Button>
            </form>
          )}

          {/* ── Formulaire Connexion ── */}
          {mode === "connexion" && (
            <form onSubmit={connexionForm.handleSubmit(onConnexion)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email-connexion">Adresse e-mail</Label>
                <Input
                  id="email-connexion"
                  type="email"
                  placeholder="marie@monrestaurant.fr"
                  autoComplete="email"
                  {...connexionForm.register("email")}
                />
                {connexionForm.formState.errors.email && (
                  <p className="text-destructive text-xs">
                    {connexionForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="motDePasse-connexion">Mot de passe</Label>
                <Input
                  id="motDePasse-connexion"
                  type="password"
                  autoComplete="current-password"
                  {...connexionForm.register("motDePasse")}
                />
                {connexionForm.formState.errors.motDePasse && (
                  <p className="text-destructive text-xs">
                    {connexionForm.formState.errors.motDePasse.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Se connecter
              </Button>
            </form>
          )}

          {/* Bascule inscription / connexion */}
          <p className="text-muted-foreground text-center text-sm">
            {mode === "inscription" ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
            <button
              type="button"
              onClick={basculerMode}
              className="text-primary font-medium hover:underline"
            >
              {mode === "inscription" ? "Se connecter" : "S'inscrire"}
            </button>
          </p>

          {/* Mode démo */}
          <div className="border-border border-t pt-4 text-center">
            <p className="text-muted-foreground mb-2 text-xs">
              Problème de connexion ? Explorez sans compte.
            </p>
            <a
              href="/onboarding/secteur"
              className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4 transition-colors"
            >
              Continuer en mode démo →
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
