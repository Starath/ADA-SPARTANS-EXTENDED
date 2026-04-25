import type { LLMProvider } from "@/types";

export class GroqProvider implements LLMProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async complete(prompt: string, system?: string): Promise<string> {
    const Groq = (await import("groq-sdk")).default;
    const client = new Groq({ apiKey: this.apiKey });

    const messages: { role: "system" | "user"; content: string }[] = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });

    const res = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      response_format: { type: "json_object" },
    });

    return res.choices[0].message.content ?? "";
  }
}
