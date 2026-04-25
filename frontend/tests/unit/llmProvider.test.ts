import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { LLMProvider } from "@/types";
import {
  getWordDefinition,
  simplifySentence,
  simplifyParagraph,
} from "@/lib/llm/prompts";

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
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns ClaudeAgentSDKProvider when PRODUCTION=true", async () => {
    process.env.PRODUCTION = "true";
    const { createLLMProvider, ClaudeAgentSDKProvider } = await import("@/lib/llm/provider");
    const provider = createLLMProvider();
    expect(provider).toBeInstanceOf(ClaudeAgentSDKProvider);
  });

  it("returns GroqProvider when PRODUCTION=false", async () => {
    process.env.PRODUCTION = "false";
    process.env.GROQ_API_KEY = "test_key";
    const { createLLMProvider, GroqProvider } = await import("@/lib/llm/provider");
    const provider = createLLMProvider();
    expect(provider).toBeInstanceOf(GroqProvider);
  });
});

describe("Prompt helpers", () => {
  it("getWordDefinition returns parsed WordDefinitionResponse", async () => {
    const provider = new MockProvider('{"definition": "cara tumbuhan buat makanan"}');
    const result = await getWordDefinition(provider, "fotosintesis");
    expect(result.definition).toBe("cara tumbuhan buat makanan");
  });

  it("simplifySentence returns parsed SimplifiedSentenceResponse", async () => {
    const provider = new MockProvider('{"simplified": "Tumbuhan butuh sinar matahari. Tumbuhan buat makanan sendiri."}');
    const result = await simplifySentence(provider, "Proses fotosintesis merupakan mekanisme...");
    expect(result.simplified).toContain("Tumbuhan");
  });

  it("simplifyParagraph returns parsed bullets array", async () => {
    const provider = new MockProvider('{"bullets": ["Tumbuhan butuh matahari", "Tumbuhan buat gula", "Gula jadi energi"]}');
    const result = await simplifyParagraph(provider, "Fotosintesis adalah proses...");
    expect(Array.isArray(result.bullets)).toBe(true);
    expect(result.bullets).toHaveLength(3);
  });

  it("throws when provider returns invalid JSON", async () => {
    const provider = new MockProvider("not json");
    await expect(getWordDefinition(provider, "test")).rejects.toThrow();
  });
});
