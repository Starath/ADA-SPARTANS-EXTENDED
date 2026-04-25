import type { LLMProvider } from "@/types";
import { ClaudeAgentSDKProvider } from "./claudeAgentSDK";
import { GroqProvider } from "./groqProvider";

export type { LLMProvider };

type Env = Record<string, string | undefined>;

export function createLLMProvider(env: Env = process.env as Env): LLMProvider {
  return env.PRODUCTION === "true"
    ? new GroqProvider(env.GROQ_API_KEY ?? "")
    : new ClaudeAgentSDKProvider();
}
