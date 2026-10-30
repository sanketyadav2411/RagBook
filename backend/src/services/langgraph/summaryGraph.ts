import { StateGraph, END } from "@langchain/langgraph";
import { SummaryStateAnnotation, type SummaryState } from "./summaryState";
import { analyzerNode } from "./nodes/analyzer";
import { generatorNode } from "./nodes/generator";
import { reviewerNode } from "./nodes/reviewer";

const MAX_RETRIES = 1;

/**
 * Decides where to go after the Reviewer node runs.
 * - approved            -> END
 * - rejected, retries left -> back to Generator (one retry only)
 * - rejected, retries exhausted -> END anyway (return best-effort summary)
 */
function routeAfterReview(state: SummaryState): "generator" | typeof END {
  if (state.approved) {
    return END;
  }
  if (state.retryCount <= MAX_RETRIES) {
    return "generator";
  }
  return END;
}

function buildSummaryGraph() {
  const graph = new StateGraph(SummaryStateAnnotation)
    .addNode("analyzer", analyzerNode)
    .addNode("generator", generatorNode)
    .addNode("reviewer", reviewerNode)
    .addEdge("__start__", "analyzer")
    .addEdge("analyzer", "generator")
    .addEdge("generator", "reviewer")
    .addConditionalEdges("reviewer", routeAfterReview, {
      generator: "generator",
      [END]: END,
    });

  return graph.compile();
}

const summaryGraph = buildSummaryGraph();

/**
 * Runs the Summary LangGraph workflow end-to-end for a piece of
 * already-retrieved document context, and returns the final summary text.
 *
 * This is the only function the rest of the app needs to know about —
 * everything else (state shape, nodes, retry logic) is an internal detail.
 */
export async function runSummaryGraph(retrievedContext: string): Promise<string> {
  console.log("[SummaryGraph] Summary graph started");

  const result = await summaryGraph.invoke({
    retrievedContext,
    analyzedContent: "",
    generatedSummary: "",
    reviewFeedback: "",
    approved: false,
    retryCount: 0,
  });

  console.log("[SummaryGraph] Summary graph completed");

  return result.generatedSummary;
}
