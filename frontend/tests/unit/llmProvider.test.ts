import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { LLMProvider } from "@/types";
import {
  getWordDefinition,
  simplifySentence,
  simplifyParagraph,
} from "@/lib/llm/prompts";

const openAiMocks = vi.hoisted(() => ({
  OpenAI: vi.fn(),
  create: vi.fn(),
}));

vi.mock("openai", () => ({
  default: openAiMocks.OpenAI,
}));

class MockProvider implements LLMProvider {
  constructor(private response: string) {}

  async complete(_prompt: string, _system?: string): Promise<string> {
    return this.response;
  }
}

describe("LLM Provider Factory", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();

    openAiMocks.create.mockReset();
    openAiMocks.OpenAI.mockReset();
    openAiMocks.create.mockResolvedValue({
      choices: [{ message: { content: '{"definition":"test"}' } }],
    });
    openAiMocks.OpenAI.mockImplementation(function MockOpenAI() {
      return {
        chat: {
          completions: {
            create: openAiMocks.create,
          },
        },
      };
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns ClaudeAgentSDKProvider when PRODUCTION=true", async () => {
    process.env.PRODUCTION = "true";
    const { createLLMProvider, ClaudeAgentSDKProvider } = await import(
      "@/lib/llm/provider"
    );
    const provider = createLLMProvider();

    expect(provider).toBeInstanceOf(OpenRouterProvider);
  });

  it("GroqProvider and OpenRouterProvider implement LLMProvider interface", async () => {
    const { GroqProvider } = await import("@/lib/llm/groqProvider");
    const { OpenRouterProvider } = await import("@/lib/llm/openRouterProvider");

    const providers: LLMProvider[] = [
      new GroqProvider("test_groq_key"),
      new OpenRouterProvider({ apiKey: "test_openrouter_key" }),
    ];

    for (const provider of providers) {
      expect(provider.complete).toEqual(expect.any(Function));
    }
  });

  it("OpenRouterProvider calls OpenAI SDK with OpenRouter baseURL", async () => {
    openAiMocks.create.mockResolvedValueOnce({
      choices: [{ message: { content: '{"definition":"contoh"}' } }],
    });

    const { OpenRouterProvider } = await import("@/lib/llm/openRouterProvider");
    const provider = new OpenRouterProvider({
      apiKey: "test_openrouter_key",
      model: "openai/gpt-4o-mini",
      siteUrl: "http://localhost:3000",
      appTitle: "DyslexiAID",
    });

    const result = await provider.complete(
      "Jelaskan kata air",
      "Jawab JSON saja"
    );

    expect(openAiMocks.OpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "test_openrouter_key",
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: expect.objectContaining({
          "HTTP-Referer": "http://localhost:3000",
          "X-OpenRouter-Title": "DyslexiAID",
        }),
      })
    );
    expect(openAiMocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: "Jawab JSON saja" },
          { role: "user", content: "Jelaskan kata air" },
        ],
        response_format: { type: "json_object" },
      })
    );
    expect(result).toBe('{"definition":"contoh"}');
  });

  it("returns GroqProvider when PRODUCTION=false", async () => {
    process.env.PRODUCTION = "false";
    process.env.GROQ_API_KEY = "test_key";
    const { createLLMProvider, GroqProvider } = await import(
      "@/lib/llm/provider"
    );
    const provider = createLLMProvider();
    expect(provider).toBeInstanceOf(GroqProvider);
  });
});

describe("Prompt helpers", () => {
  it("getWordDefinition returns parsed WordDefinitionResponse", async () => {
    const provider = new MockProvider(
      '{"definition": "cara tumbuhan buat makanan"}'
    );
    const result = await getWordDefinition(provider, "fotosintesis");
    expect(result.definition).toBe("cara tumbuhan buat makanan");
  });

  it("simplifySentence returns parsed SimplifiedSentenceResponse", async () => {
    const provider = new MockProvider(
      '{"simplified": "Tumbuhan butuh sinar matahari. Tumbuhan buat makanan sendiri."}'
    );
    const result = await simplifySentence(
      provider,
      "Proses fotosintesis merupakan mekanisme..."
    );
    expect(result.simplified).toContain("Tumbuhan");
  });

  it("simplifyParagraph returns parsed bullets array", async () => {
    const provider = new MockProvider(
      '{"bullets": ["Tumbuhan butuh matahari", "Tumbuhan buat gula", "Gula jadi energi"]}'
    );
    const result = await simplifyParagraph(
      provider,
      "Fotosintesis adalah proses..."
    );
    expect(Array.isArray(result.bullets)).toBe(true);
    expect(result.bullets).toHaveLength(3);
  });

  it("throws when provider returns invalid JSON", async () => {
    const provider = new MockProvider("not json");
    await expect(getWordDefinition(provider, "test")).rejects.toThrow();
  });
});
