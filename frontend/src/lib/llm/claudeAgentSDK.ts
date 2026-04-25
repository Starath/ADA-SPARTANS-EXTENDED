import type { LLMProvider } from "@/types";

// Requires: npm install -g @anthropic-ai/claude-code && claude auth login
export class ClaudeAgentSDKProvider implements LLMProvider {
  async complete(prompt: string, system?: string): Promise<string> {
    // webpackIgnore: package is a server-only CLI SDK not installed in node_modules;
    // only used at runtime when PRODUCTION=true and the SDK is globally available.
    const { query } = await import(/* webpackIgnore: true */ "@anthropic-ai/claude-agent-sdk");

    const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;

    for await (const message of query({
      prompt: fullPrompt,
      options: { maxTurns: 1 },
    })) {
      if (message.type === "result") {
        if (message.subtype === "success") {
          return message.result;
        }
        throw new Error(`Claude Agent SDK error: ${message.subtype}`);
      }
    }
    throw new Error("Claude Agent SDK returned no result");
  }
}
