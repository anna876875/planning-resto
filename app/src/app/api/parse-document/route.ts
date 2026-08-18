import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const PROMPT = `Tu es un assistant RH. Analyse ce document (CV ou contrat de travail) et extrais les informations de l'employé.

Retourne UNIQUEMENT un objet JSON valide, sans markdown ni texte autour :
{
  "nom": "Prénom Nom complet",
  "poste": "intitulé exact du poste",
  "email": "adresse@domaine.fr",
  "telephone": "numéro de téléphone",
  "contrat": "CDI" | "CDD" | "temps_partiel" | "extra",
  "heuresHebdo": nombre entier (35 si temps plein, 18 si mi-temps),
  "dateDebut": "YYYY-MM-DD",
  "dateFinCDD": "YYYY-MM-DD"
}

Règles de mapping du contrat :
- "temps partiel", "mi-temps", "à temps partiel" → "temps_partiel"
- "extra", "vacation", "vacataire", "intérim" → "extra"
- "CDD", "contrat à durée déterminée" → "CDD"
- Tout autre cas → "CDI"

Omets les champs non trouvés dans le document.`;

function extractJSON(text: string): unknown {
  try { return JSON.parse(text.trim()); } catch { /* fall through */ }
  const m = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (m) try { return JSON.parse(m[1]); } catch { /* fall through */ }
  return null;
}

const VALID_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, mimeType } = body as { image?: string; mimeType?: string };

    if (!image || !mimeType) {
      return NextResponse.json({ error: "Champs image et mimeType requis." }, { status: 400 });
    }
    if (!VALID_TYPES.has(mimeType)) {
      return NextResponse.json({ error: "Format non supporté. Utilisez JPG, PNG ou WebP." }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "Clé API manquante — ajoutez ANTHROPIC_API_KEY dans .env.local." }, { status: 500 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: image,
            },
          },
          { type: "text", text: PROMPT },
        ],
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const data = extractJSON(text);

    if (!data) {
      return NextResponse.json({ error: "Document illisible ou format non reconnu.", raw: text }, { status: 422 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[parse-document]", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
