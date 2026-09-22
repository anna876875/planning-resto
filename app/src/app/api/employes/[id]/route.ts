import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// Vérifie que l'employé appartient bien au restaurant de l'utilisateur connecté
async function getEmployeSecure(supabase: Awaited<ReturnType<typeof createSupabaseServer>>, userId: string, employeId: string) {
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!restaurant) return null;

  const { data: employe } = await supabase
    .from("employes")
    .select("*")
    .eq("id", employeId)
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();

  return employe;
}

// ─── PATCH : modifier un employé ─────────────────────────────────────────────

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const employe = await getEmployeSecure(supabase, user.id, id);
  if (!employe) {
    return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
  }

  const body = await req.json();

  const { data: updated, error } = await supabase
    .from("employes")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}

// ─── DELETE : supprimer un employé ───────────────────────────────────────────

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const employe = await getEmployeSecure(supabase, user.id, id);
  if (!employe) {
    return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
  }

  const { error } = await supabase.from("employes").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
