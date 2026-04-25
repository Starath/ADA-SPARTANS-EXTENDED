// Test stub — real implementation requires `claude` CLI to be installed and authenticated
export async function* query(_opts: { prompt: string; options?: { maxTurns?: number } }) {
  yield { type: "result", subtype: "success", result: "" };
}
