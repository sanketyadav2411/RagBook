import { getSummaryLLM } from "../llm";
import type { SummaryState } from "../summaryState";

const REVIEWER_PROMPT = `You are reviewing an AI-generated summary of a document for quality.

Check the summary against the original content for:
- Missing important information
- Redundant or repeated sentences
- Hallucinated content (claims not supported by the original content)
- Grammar and readability
- Logical flow

Respond with ONLY a JSON object, no markdown fences, no commentary, in exactly this shape:
{"status": "approved" | "regenerate", "feedback": "short actionable feedback, empty string if approved"}

Original content:
---
{content}
---

Generated summary:
---
{summary}
---`;

interface ReviewResult {
  status: "approved" | "regenerate";
  feedback: string;
}

function parseReviewResponse(raw: string): ReviewResult {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.status === "approved" || parsed.status === "regenerate") {
      return { status: parsed.status, feedback: parsed.feedback ?? "" };
    }
  } catch {
    // fall through to default below
  }
  // If parsing fails, fail open (approve) rather than risk an infinite/broken loop.
  return { status: "approved", feedback: "" };
}

/**
 * Reviewer Node
 * Input:  state.analyzedContent, state.generatedSummary
 * Output: state.approved, state.reviewFeedback
 */
export async function reviewerNode(state: SummaryState): Promise<Partial<SummaryState>> {
  console.log("[SummaryGraph] Review started");

  const llm = getSummaryLLM(0);
  const prompt = REVIEWER_PROMPT.replace("{content}", state.analyzedContent).replace(
    "{summary}",
    state.generatedSummary
  );

  const response = await llm.invoke(prompt);
  const { status, feedback } = parseReviewResponse(response.content.toString());

  console.log(`[SummaryGraph] Review ${status === "approved" ? "passed" : "requested regeneration"}`);

  return {
    approved: status === "approved",
    reviewFeedback: feedback,
  };
}
