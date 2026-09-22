import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// ─── GET : liste tous les employés du restaurant connecté ────────────────────

export async function GET() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json([], { status: 200 });
  }

  // Récupère le restaurant de l'utilisateur
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!restaurant) {
    return NextResponse.json([]);
  }

  const { data: employes, error } = await supabase
    .from("employes")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("nom");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(employes ?? []);
}

// ─── POST : créer un nouvel employé ─────────────────────────────────────────

export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
  }

  const body = (await req.json()) as {
    nom: string;
    poste: string;
    email?: string;
    telephone?: string;
    statut?: string;
    contrat?: string;
    heures_hebdo?: number;
    date_debut?: string;
    date_fin_cdd?: string;
    note?: string;
  };

  const { data: employe, error } = await supabase
    .from("employes")
    .insert({
      restaurant_id: restaurant.id,
      nom: body.nom,
      poste: body.poste,
      email: body.email ?? null,
      telephone: body.telephone ?? null,
      statut: body.statut ?? "actif",
      contrat: body.contrat ?? "CDI",
      heures_hebdo: body.heures_hebdo ?? 35,
      date_debut: body.date_debut ?? new Date().toISOString().split("T")[0],
      date_fin_cdd: body.date_fin_cdd ?? null,
      note: body.note ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(employe, { status: 201 });
}
