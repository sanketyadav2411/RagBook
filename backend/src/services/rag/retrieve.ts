import { QdrantClient } from "@qdrant/js-client-rest";
import { embedTexts } from "../embeddings/cloudflare";
import { collectionNameForNote } from "./collection";

const QDRANT_URL = process.env.QDRANT_URL || "http://qdrant:6333";
const TOP_K = 5;

async function embedQuery(query: string): Promise<number[]> {
  const [embedding] = await embedTexts([query]);
  return embedding;
}

export interface RetrievedChunk {
  text: string;
  documentName: string;
  chunkIndex: number;
  score: number;
}

export async function retrieveChunks(query: string, noteId: string): Promise<RetrievedChunk[]> {
  const queryVector = await embedQuery(query);

  const qdrant = new QdrantClient({ url: QDRANT_URL, apiKey: process.env.QDRANT_API_KEY });
  const collectionName = collectionNameForNote(noteId);

  const searchResult = await qdrant.query(collectionName, {
    query: queryVector,
    limit: TOP_K,
    with_payload: true,
  });

  return searchResult.points.map((hit) => ({
    text: hit.payload?.text as string,
    documentName: hit.payload?.documentName as string,
    chunkIndex: hit.payload?.chunkIndex as number,
    score: hit.score,
  }));
}
