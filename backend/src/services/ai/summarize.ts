import { QdrantClient } from "@qdrant/js-client-rest";
import { runSummaryGraph } from "../langgraph/summaryGraph";

const QDRANT_URL = process.env.QDRANT_URL || "http://qdrant:6333";

async function getAllChunks(noteId: string): Promise<string> {
  const qdrant = new QdrantClient({ url: QDRANT_URL, apiKey: process.env.QDRANT_API_KEY });
  const collectionName = `note-${noteId}`;

  const result = await qdrant.scroll(collectionName, {
    limit: 200,
    with_payload: true,
  });

  const texts = result.points
    .sort((a, b) => ((a.payload?.chunkIndex as number) ?? 0) - ((b.payload?.chunkIndex as number) ?? 0))
    .map((p) => p.payload?.text as string)
    .filter(Boolean);

  return texts.join("\n\n");
}

export async function generateSummary(noteId: string): Promise<string> {
  const fullText = await getAllChunks(noteId);
  if (!fullText.trim()) return "No document content found. Please upload documents first.";

  // The single direct Groq call is now replaced by the LangGraph
  // Summary workflow (Analyzer -> Generator -> Reviewer -> Final Summary).
  // Retrieval above is unchanged; the graph only runs on already-retrieved text.
  return runSummaryGraph(fullText);
}
