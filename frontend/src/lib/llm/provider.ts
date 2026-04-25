import type { LLMProvider } from "@/types";

export type { LLMProvider };

export function createLLMProvider(): LLMProvider {
  if (process.env.PRODUCTION === "true") {
    const { GroqProvider } = require("./groqProvider");
    return new GroqProvider(process.env.GROQ_API_KEY!);
  }
  const { ClaudeAgentSDKProvider } = require("./claudeAgentSDK");
  return new ClaudeAgentSDKProvider();
}
