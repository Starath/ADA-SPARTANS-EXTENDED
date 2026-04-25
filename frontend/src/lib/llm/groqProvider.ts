import type { LLMProvider } from "@/types";

export class GroqProvider implements LLMProvider {
  constructor(private readonly apiKey: string) {}

  async complete(prompt: string, system?: string): Promise<string> {
    const Groq = (await import("groq-sdk")).default;
    const client = new Groq({ apiKey: this.apiKey });
    const messages = buildMessages(prompt, system);

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      response_format: { type: "json_object" },
    });

    return response.choices[0]?.message?.content ?? "";
  }

  async *stream(prompt: string, system?: string): AsyncIterable<string> {
    const Groq = (await import("groq-sdk")).default;
    const client = new Groq({ apiKey: this.apiKey });
    const messages = buildMessages(prompt, system);

    const stream = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }
}

function buildMessages(prompt: string, system?: string) {
  const messages: { role: "system" | "user"; content: string }[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });
  return messages;
}
