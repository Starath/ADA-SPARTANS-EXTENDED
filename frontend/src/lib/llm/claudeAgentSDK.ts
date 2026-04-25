import type { LLMProvider } from "@/types";

// Uses the locally installed `claude` CLI binary via claude-agent-sdk
// Requires: npm install -g @anthropic-ai/claude-code && claude auth login
export class ClaudeAgentSDKProvider implements LLMProvider {
  async complete(prompt: string, system?: string): Promise<string> {
    // Dynamic import so this module is only loaded server-side
    const { query } = await import("@anthropic-ai/claude-agent-sdk");

    const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;

    for await (const message of query({
      prompt: fullPrompt,
      options: { maxTurns: 1 },
    })) {
      if (message.type === "result") {
        return message.result ?? "";
      }
    }
    throw new Error("Claude Agent SDK returned no result");
  }
}
