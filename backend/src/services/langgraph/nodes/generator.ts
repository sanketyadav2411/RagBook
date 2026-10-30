import { getSummaryLLM } from "../llm";
import type { SummaryState } from "../summaryState";

const BASE_PROMPT = `Please provide a comprehensive summary of the following document content. Structure it as clean Markdown with:
1. A brief overview (2-3 sentences)
2. Key topics covered (bullet points)
3. Main takeaways

Preserve key technical details and do not invent information that isn't present in the content.

Document content:
---
{content}
---`;

const REGENERATION_SUFFIX = `

Your previous summary was reviewed and needs improvement. Address this feedback in the new version:
"{feedback}"`;

/**
 * Summary Generator Node
 * Input:  state.analyzedContent, and on retries state.reviewFeedback
 * Output: state.generatedSummary, state.retryCount (incremented)
 */
export async function generatorNode(state: SummaryState): Promise<Partial<SummaryState>> {
  const isRetry = state.retryCount > 0;
  console.log(`[SummaryGraph] Summary Generator started${isRetry ? " (retry)" : ""}`);

  const llm = getSummaryLLM(0.3);

  let prompt = BASE_PROMPT.replace("{content}", state.analyzedContent);
  if (isRetry && state.reviewFeedback) {
    prompt += REGENERATION_SUFFIX.replace("{feedback}", state.reviewFeedback);
  }

  const response = await llm.invoke(prompt);
  const generatedSummary = response.content.toString().trim();

  console.log("[SummaryGraph] Summary generated");

  return {
    generatedSummary,
    retryCount: state.retryCount + 1,
  };
}
