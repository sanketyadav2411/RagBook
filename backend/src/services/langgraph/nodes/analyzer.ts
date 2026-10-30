import { getSummaryLLM } from "../llm";
import type { SummaryState } from "../summaryState";

const ANALYZER_PROMPT = `You are analyzing raw document chunks retrieved from a knowledge base.

Your job is ONLY to organize and clean this content — do NOT summarize it yet.

Responsibilities:
- Identify the document's structure and important sections.
- Remove duplicate or redundant passages that repeat the same information.
- Group related content together so it reads as one coherent, organized body of text.
- Do not add new information and do not omit important details.

Return the cleaned, organized content as plain text (no commentary, no preamble).

Retrieved content:
---
{context}
---`;

/**
 * Analyzer Node
 * Input:  state.retrievedContext
 * Output: state.analyzedContent
 */
export async function analyzerNode(state: SummaryState): Promise<Partial<SummaryState>> {
  console.log("[SummaryGraph] Analyzer started");

  const llm = getSummaryLLM(0.1);
  const prompt = ANALYZER_PROMPT.replace("{context}", state.retrievedContext);

  const response = await llm.invoke(prompt);
  const analyzedContent = response.content.toString().trim();

  console.log("[SummaryGraph] Analyzer finished");

  return { analyzedContent };
}
