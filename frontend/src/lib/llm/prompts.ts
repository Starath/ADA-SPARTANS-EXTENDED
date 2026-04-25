import type {
  LLMProvider,
  WordDefinitionResponse,
  SimplifiedSentenceResponse,
  SimplifiedParagraphResponse,
} from "@/types";

const SYSTEM_PROMPT =
  "Kamu adalah asisten edukasi anak disleksia berbahasa Indonesia. Selalu jawab dalam format JSON yang diminta saja, tanpa teks lain.";

export async function getWordDefinition(
  provider: LLMProvider,
  word: string
): Promise<WordDefinitionResponse> {
  const prompt = `Anak disleksia SD kelas 2 menatap kata "${word}" sangat lama.\nBeri penjelasan 1 kalimat singkat seperti menjelaskan ke anak.\nFormat: {"definition": "..."}`;
  const raw = await provider.complete(prompt, SYSTEM_PROMPT);
  return JSON.parse(raw);
}

export async function simplifySentence(
  provider: LLMProvider,
  sentence: string
): Promise<SimplifiedSentenceResponse> {
  const prompt = `Anak disleksia kesulitan membaca kalimat ini:\n"${sentence}"\nTulis ulang menjadi maksimal 2 kalimat pendek dengan struktur Subjek-Predikat-Objek. Hindari kalimat majemuk.\nFormat: {"simplified": "..."}`;
  const raw = await provider.complete(prompt, SYSTEM_PROMPT);
  return JSON.parse(raw);
}

export async function simplifyParagraph(
  provider: LLMProvider,
  paragraph: string
): Promise<SimplifiedParagraphResponse> {
  const prompt = `Anak disleksia berulang kali gagal membaca paragraf ini:\n"${paragraph}"\nUbah menjadi 3-5 poin ringkas. Setiap poin maksimal 8 kata. Gunakan kata-kata sederhana.\nFormat: {"bullets": ["...", "...", "..."]}`;
  const raw = await provider.complete(prompt, SYSTEM_PROMPT);
  return JSON.parse(raw);
}
