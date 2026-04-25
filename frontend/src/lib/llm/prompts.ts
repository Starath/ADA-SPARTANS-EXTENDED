import type {
  LLMProvider,
  SimplifiedParagraphResponse,
  SimplifiedSentenceResponse,
  WordDefinitionResponse,
} from "@/types";

const SYSTEM_PROMPT =
  "Kamu adalah asisten edukasi anak disleksia berbahasa Indonesia. Jawab JSON saja, tanpa teks tambahan.";

export async function getWordDefinition(
  provider: LLMProvider,
  word: string
): Promise<WordDefinitionResponse> {
  const prompt = `Anak disleksia menatap kata ini sangat lama: "${word}"\nBerikan penjelasan 1 kalimat singkat seperti menjelaskan ke anak SD kelas 2.\nFormat: {"definition": "..."}`;
  const parsed = parseJsonObject(await provider.complete(prompt, SYSTEM_PROMPT));

  if (!isRecord(parsed) || typeof parsed.definition !== "string") {
    throw new Error("Invalid word definition response");
  }

  return { definition: parsed.definition };
}

export async function simplifySentence(
  provider: LLMProvider,
  sentence: string
): Promise<SimplifiedSentenceResponse> {
  const prompt = `Anak disleksia kesulitan membaca: "${sentence}"\nTulis ulang menjadi maksimal 2 kalimat pendek dengan struktur SPO sederhana.\nFormat: {"simplified": "..."}`;
  const parsed = parseJsonObject(await provider.complete(prompt, SYSTEM_PROMPT));

  if (!isRecord(parsed) || typeof parsed.simplified !== "string") {
    throw new Error("Invalid sentence simplification response");
  }

  return { simplified: parsed.simplified };
}

export async function simplifyParagraph(
  provider: LLMProvider,
  paragraph: string
): Promise<SimplifiedParagraphResponse> {
  const prompt = `Anak disleksia berulang kali gagal membaca paragraf ini: "${paragraph}"\nUbah menjadi 3-5 poin ringkas, setiap poin maksimal 8 kata.\nFormat: {"bullets": ["...", "..."]}`;
  const parsed = parseJsonObject(await provider.complete(prompt, SYSTEM_PROMPT));

  if (
    !isRecord(parsed) ||
    !Array.isArray(parsed.bullets) ||
    !parsed.bullets.every((item) => typeof item === "string")
  ) {
    throw new Error("Invalid paragraph simplification response");
  }

  return { bullets: parsed.bullets };
}

function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch (error) {
    const jsonObjectMatch = withoutFence.match(/\{[\s\S]*\}/);
    if (!jsonObjectMatch) throw error;
    return JSON.parse(jsonObjectMatch[0]);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
