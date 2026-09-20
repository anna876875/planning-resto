import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM = `Tu es l'assistant de configuration de Planning Resto.
Tu analyses en langage naturel les réponses d'un responsable de restaurant et tu extrais des données structurées.
Détecte aussi si l'utilisateur a fourni des informations qui répondent à des questions futures (jours chargés, postes mentionnés, etc.).
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown ni texte autour.`;

function extractJSON(text: string): unknown {
  try {
    return JSON.parse(text.trim());
  } catch {
    const m = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (m) try { return JSON.parse(m[1]); } catch { /* noop */ }
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY manquante." }, { status: 500 });
  }

  const { step, answer } = (await req.json()) as { step: string; answer: string };

  if (step !== "horaires") {
    return NextResponse.json({ error: "Step non supporté." }, { status: 400 });
  }

  const prompt = `L'utilisateur décrit ses horaires d'ouverture : "${answer}"

Extrais ces informations et retourne exactement ce JSON :
{
  "joursOuverts": [entiers 0–6 où 1=Lun, 2=Mar, 3=Mer, 4=Jeu, 5=Ven, 6=Sam, 0=Dim],
  "services": {
    "matin": { "actif": true/false, "debut": "HH:MM", "fin": "HH:MM" },
    "soir":  { "actif": true/false, "debut": "HH:MM", "fin": "HH:MM" }
  },
  "confirmation": "Résumé court et humain (ex: Lun–Sam · Midi 11:30→15:00 · Soir 19:00→23:00 · Dim fermé)",
  "prefill": {
    "joursAffluence": [indices des jours explicitement mentionnés comme chargés/fréquentés],
    "postes": ["Cuisine", "Salle", etc. si mentionnés, sinon []]
  }
}

Règles :
- Si un service est mentionné sans horaires précis, utilise midi 11:30–15:00 ou soir 19:00–23:00 comme défaut.
- Si seulement un service est mentionné, mets actif:false pour l'autre avec des horaires par défaut.
- Si l'utilisateur ne précise pas de service (ex: "de 9h à 17h"), considère matin actif, soir inactif.
- joursOuverts contient uniquement les jours où le restaurant est ouvert.`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    const data = extractJSON(raw);

    if (!data) {
      return NextResponse.json({ error: "Impossible d'analyser la réponse.", raw }, { status: 422 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[onboarding/parse]", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
