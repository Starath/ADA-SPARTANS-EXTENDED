import { NextRequest, NextResponse } from "next/server";
import { createLLMProvider } from "@/lib/llm/provider";
import {
  getWordDefinition,
  simplifySentence,
  simplifyParagraph,
} from "@/lib/llm/prompts";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, payload } = body as {
    action: string;
    payload: Record<string, string>;
  };

  const provider = createLLMProvider();

  switch (action) {
    case "word_definition":
      return NextResponse.json(await getWordDefinition(provider, payload.word));
    case "simplify_sentence":
      return NextResponse.json(await simplifySentence(provider, payload.text));
    case "simplify_paragraph":
      return NextResponse.json(await simplifyParagraph(provider, payload.text));
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
