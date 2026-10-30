import { Annotation } from "@langchain/langgraph";

/**
 * State that flows through the Summary LangGraph workflow.
 *
 * Only fields that are actually consumed/produced by a node are included.
 * Retrieval happens BEFORE this graph runs, so `retrievedContext` is the
 * graph's entry point, not something the graph itself fetches.
 */
export const SummaryStateAnnotation = Annotation.Root({
  /** Raw joined chunk text pulled from Qdrant before the graph starts. */
  retrievedContext: Annotation<string>,

  /** Cleaned / structured version of the context produced by the Analyzer node. */
  analyzedContent: Annotation<string>,

  /** The summary produced by the Generator node (may be regenerated once). */
  generatedSummary: Annotation<string>,

  /** Feedback text from the Reviewer node, used to guide a regeneration pass. */
  reviewFeedback: Annotation<string>,

  /** Whether the Reviewer approved the current summary. */
  approved: Annotation<boolean>,

  /** How many times the Generator has run. Capped at 1 retry. */
  retryCount: Annotation<number>,
});

export type SummaryState = typeof SummaryStateAnnotation.State;
