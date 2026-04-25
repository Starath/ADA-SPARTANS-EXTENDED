// Type stub for @anthropic-ai/claude-agent-sdk
// The real package requires the `claude` CLI to be installed and authenticated.
declare module "@anthropic-ai/claude-agent-sdk" {
  interface ResultMessage {
    type: "result";
    subtype: "success" | "error_max_turns" | "error_during_execution";
    result: string;
  }

  // Other message types (assistant, user, system, etc.)
  interface AssistantMessage {
    type: "assistant";
    [key: string]: unknown;
  }

  interface SystemMessage {
    type: "system";
    [key: string]: unknown;
  }

  type SDKMessage = ResultMessage | AssistantMessage | SystemMessage;

  interface QueryOptions {
    prompt: string;
    options?: {
      maxTurns?: number;
    };
  }

  export function query(opts: QueryOptions): AsyncIterable<SDKMessage>;
}
