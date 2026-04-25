import OpenAI from "openai";
import type { LLMProvider } from "@/types";

type OpenRouterProviderOptions = {
  apiKey?: string;
  model?: string;
  siteUrl?: string;
  appTitle?: string;
};

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export class OpenRouterProvider implements LLMProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: OpenRouterProviderOptions | string = {}) {
    const config = typeof options === "string" ? { apiKey: options } : options;
    const apiKey = config.apiKey ?? process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is required to create OpenRouterProvider");
    }

    const siteUrl = config.siteUrl ?? process.env.OPENROUTER_SITE_URL;
    const appTitle = config.appTitle ?? process.env.OPENROUTER_APP_TITLE;

    this.model = config.model ?? process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
    this.client = new OpenAI({
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders: {
        ...(siteUrl ? { "HTTP-Referer": siteUrl } : {}),
        ...(appTitle ? { "X-OpenRouter-Title": appTitle } : {}),
      },
    });
  }

  async complete(prompt: string, system?: string): Promise<string> {
    const messages: Array<{ role: "system" | "user"; content: string }> = [];

    if (system) {
      messages.push({ role: "system", content: system });
    }
    messages.push({ role: "user", content: prompt });

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      response_format: { type: "json_object" },
    });

    return response.choices[0]?.message?.content ?? "";
  }
}
