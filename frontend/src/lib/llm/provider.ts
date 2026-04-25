import type { LLMProvider } from "@/types";
import { GroqProvider } from "./groqProvider";
import { ClaudeAgentSDKProvider } from "./claudeAgentSDK";

export type { LLMProvider };
export { GroqProvider, ClaudeAgentSDKProvider };

export function createLLMProvider(): LLMProvider {
  if (process.env.PRODUCTION === "true") {
    return new ClaudeAgentSDKProvider();
  }
  return new GroqProvider(process.env.GROQ_API_KEY!);
}
