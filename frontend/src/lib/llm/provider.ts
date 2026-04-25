import type { LLMProvider } from "@/types";
import { GroqProvider } from "./groqProvider";
import { OpenRouterProvider } from "./openRouterProvider";

export type { LLMProvider };

export function createLLMProvider(): LLMProvider {
  if (process.env.PRODUCTION === "false") {
    return new GroqProvider(process.env.GROQ_API_KEY!);
  }

  return new OpenRouterProvider({
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL,
    siteUrl: process.env.OPENROUTER_SITE_URL,
    appTitle: process.env.OPENROUTER_APP_TITLE,
  });
}
