import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { DEFAULT_CONFIG, type PlanningConfig } from "@/lib/planning/config";

export async function GET() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Non connecté → config par défaut (mode dev sans auth)
  if (!user) {
    return NextResponse.json({ id: null, config: DEFAULT_CONFIG });
  }

  // Cherche le restaurant de cet utilisateur
  const { data: existing } = await supabase
    .from("restaurants")
    .select("id, nom, secteur, config")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(existing);
  }

  // Pas encore de restaurant → le créer automatiquement
  const { data: created, error } = await supabase
    .from("restaurants")
    .insert({
      user_id: user.id,
      nom: "Mon restaurant",
      config: DEFAULT_CONFIG,
    })
    .select("id, nom, secteur, config")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(created);
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
  }

  const body = (await req.json()) as {
    config?: PlanningConfig;
    nom?: string;
    secteur?: string;
  };

  const { error } = await supabase.from("restaurants").update(body).eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
